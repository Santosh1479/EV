
import React, { useEffect, useRef, useState } from "react";
import { useNavigate }  from "expo-router";

const PORT_IMAGE_MAP = {
  type1: "/icons/type1.png",
  type2: "/icons/type2.png",
  ccs: "/icons/ccs.png",
  chademo: "/icons/chademo.png",
};

const LocationSearchPanel = ({
  setPanelOpen,
  setSelect,
  userLocation,
  setMicOn,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const stationsRef = useRef([]);
  const isListeningRef = useRef(false);
  const mountedRef = useRef(true);

  const navigate = useNavigate();

  /*
   * Get an appropriate image based on the station's
   * available charging port types.
   */
  const getStationImage = (station) => {
    if (!station?.portTypes) {
      return "/icons/placeholder.png";
    }

    const preferredPort = [
      "type1",
      "type2",
      "ccs",
      "chademo",
    ].find(
      (key) => station.portTypes?.[key]?.total > 0
    );

    return preferredPort
      ? PORT_IMAGE_MAP[preferredPort]
      : "/icons/placeholder.png";
  };

  /*
   * Navigate to station details.
   */
  const handleStationDetails = (station) => {
    if (!station || !userLocation) {
      return;
    }

    setSelect(station);
    setPanelOpen(false);

    navigate(
      `/station/${station._id}?originLat=${userLocation.latitude}&originLng=${userLocation.longitude}`
    );
  };

  /*
   * Navigate to the route/map page.
   */
  const handleCardClick = (station) => {
    if (!station || !userLocation) {
      return;
    }

    setSelect(station);
    setPanelOpen(false);

    navigate(
      `/page?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&destinationLat=${station.latitude}&destinationLng=${station.longitude}`
    );
  };

  /*
   * Same route navigation used by voice selection.
   */
  const handleSuggestionClick = (station) => {
    handleCardClick(station);
  };

  /*
   * Safely stop speech recognition.
   */
  const stopRecognition = () => {
    isListeningRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.debug("Recognition already stopped.");
      }

      recognitionRef.current = null;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  /*
   * Speak text using browser speech synthesis.
   */
  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = resolve;
      utterance.onerror = resolve;

      window.speechSynthesis.speak(utterance);
    });
  };

  /*
   * Announce the nearest charging stations.
   */
  const voiceOutResults = async (stations) => {
    if (!stations || stations.length === 0) {
      await speak(
        "Sorry, I could not find any charging stations nearby."
      );

      return;
    }

    let message = `Found ${stations.length} charging station${
      stations.length === 1 ? "" : "s"
    }.`;

    const firstThreeStations = stations.slice(0, 3);

    firstThreeStations.forEach((station, index) => {
      message += ` Station ${index + 1}: ${
        station.name || "Unknown station"
      }, ${
        station.portsAvailable ?? 0
      } ports available.`;
    });

    await speak(message);

    /*
     * Only start voice selection after the station
     * announcement has finished.
     */
    if (mountedRef.current && stations.length > 0) {
      setMicOn(true);
      startListeningForSelection(stations);
    }
  };

  /*
   * Ask the Python/AI backend which station the user selected.
   */
  const predictStation = async (transcript, stations) => {
    try {
      const stationNames = stations.map(
        (station) => station.name
      );

      const response = await fetch(
        "http://localhost:5000/predict_station",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: transcript,
            stations: stationNames,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Station prediction failed with status ${response.status}`
        );
      }

      const data = await response.json();

      return data?.station || null;
    } catch (err) {
      console.error(
        "Error predicting selected station:",
        err
      );

      return null;
    }
  };

  /*
   * Start listening for the user to select a station.
   */
  const startListeningForSelection = (stations) => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn(
        "Speech recognition is not supported by this browser."
      );

      setMicOn(false);

      return;
    }

    /*
     * Stop an existing recognition instance first.
     */
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (err) {
        console.debug(
          "Previous recognition instance already stopped."
        );
      }
    }

    const recognition = new SpeechRecognition();

    recognitionRef.current = recognition;
    stationsRef.current = stations;
    isListeningRef.current = true;

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("Listening for station selection...");
    };

    recognition.onresult = async (event) => {
      try {
        const lastResult =
          event.results[event.results.length - 1];

        if (!lastResult || !lastResult[0]) {
          return;
        }

        const transcript =
          lastResult[0].transcript.trim();

        if (!transcript) {
          return;
        }

        console.log(
          `Station selection command: ${transcript}`
        );

        /*
         * Stop listening while the backend determines
         * which station was selected.
         */
        isListeningRef.current = false;

        try {
          recognition.stop();
        } catch (err) {
          console.debug(
            "Recognition already stopped."
          );
        }

        const selectedStationName =
          await predictStation(
            transcript,
            stations
          );

        if (!selectedStationName) {
          await speak(
            "I could not understand which station you selected. Please try again."
          );

          if (mountedRef.current) {
            setMicOn(true);
            startListeningForSelection(stations);
          }

          return;
        }

        /*
         * Match the backend result against the actual
         * stations returned by the API.
         */
        const selectedStation = stations.find(
          (station) =>
            station?.name?.toLowerCase().trim() ===
            selectedStationName?.toLowerCase().trim()
        );

        /*
         * Also support partial matching in case the AI
         * returns a slightly different station name.
         */
        const fallbackStation =
          selectedStation ||
          stations.find((station) => {
            const stationName =
              station?.name?.toLowerCase().trim() || "";

            const predictedName =
              selectedStationName
                ?.toLowerCase()
                .trim() || "";

            return (
              stationName.includes(predictedName) ||
              predictedName.includes(stationName)
            );
          });

        if (fallbackStation) {
          await speak(
            `Opening ${fallbackStation.name}.`
          );

          if (mountedRef.current) {
            setMicOn(false);
            handleSuggestionClick(fallbackStation);
          }

          return;
        }

        await speak(
          `Station ${transcript} was not found. Please try again.`
        );

        if (mountedRef.current) {
          setMicOn(true);
          startListeningForSelection(stations);
        }
      } catch (err) {
        console.error(
          "Error processing station selection:",
          err
        );

        if (mountedRef.current) {
          setMicOn(true);
          startListeningForSelection(stations);
        }
      }
    };

    recognition.onerror = async (event) => {
      console.error(
        "Station speech recognition error:",
        event.error
      );

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        isListeningRef.current = false;
        setMicOn(false);

        await speak(
          "Microphone permission is required for voice station selection."
        );

        return;
      }

      /*
       * Ignore harmless no-speech/audio errors and allow
       * the user to try again.
       */
      if (
        event.error === "no-speech" ||
        event.error === "audio-capture"
      ) {
        if (mountedRef.current) {
          setTimeout(() => {
            if (
              mountedRef.current &&
              stationsRef.current.length > 0
            ) {
              setMicOn(true);
              startListeningForSelection(
                stationsRef.current
              );
            }
          }, 500);
        }
      }
    };

    recognition.onend = () => {
      console.log(
        "Station selection recognition ended."
      );

      /*
       * Do not automatically restart here.
       * The result/error handlers decide when another
       * listening session should begin.
       */
      if (recognitionRef.current === recognition) {
        recognitionRef.current = null;
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error(
        "Unable to start station speech recognition:",
        err
      );

      isListeningRef.current = false;
      setMicOn(false);
    }
  };

  /*
   * Fetch nearest charging stations whenever the
   * Home component supplies a new userLocation.
   */
  useEffect(() => {
    mountedRef.current = true;

    if (!userLocation) {
      return () => {
        mountedRef.current = false;
      };
    }

    const fetchNearestLocations = async () => {
      setLoading(true);
      setError("");

      try {
        const token =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken");

        const params = new URLSearchParams({
          origin: `${userLocation.latitude},${userLocation.longitude}`,
        });

        const response = await fetch(
          `http://localhost:3000/maps/get-nearest-locations?${params.toString()}`,
          {
            method: "GET",
            headers: {
              Authorization: token
                ? `Bearer ${token}`
                : "",
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Nearest locations request failed with status ${response.status}`
          );
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
          throw new Error(
            "Unexpected response format from nearest locations API."
          );
        }

        if (!mountedRef.current) {
          return;
        }

        setSuggestions(data);
        stationsRef.current = data;

        /*
         * Announce stations only when there are results.
         */
        await voiceOutResults(data);
      } catch (err) {
        console.error(
          "Error fetching nearest locations:",
          err
        );

        if (mountedRef.current) {
          setSuggestions([]);
          setError(
            "Unable to load nearby charging stations. Please try again."
          );

          await speak(
            "Sorry, I could not load the nearby charging stations."
          );
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchNearestLocations();

    return () => {
      mountedRef.current = false;

      stopRecognition();
      setMicOn(false);
    };
  }, [
    userLocation?.latitude,
    userLocation?.longitude,
  ]);

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto">
      {/* Close panel button */}
      <button
        type="button"
        onClick={() => {
          stopRecognition();
          setMicOn(false);
          setPanelOpen(false);
        }}
        aria-label="Close charging station panel"
        className="mb-2 flex w-full justify-center"
      >
        <i className="ri-arrow-down-wide-line text-4xl font-bold text-white" />
      </button>

      {/* Loading */}
      {loading && (
        <div className="flex w-full flex-col items-center justify-center py-8 text-white">
          <i className="ri-loader-4-line mb-2 animate-spin text-4xl" />

          <p className="font-semibold">
            Finding nearby charging stations...
          </p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="w-full rounded-xl bg-white p-5 text-center">
          <i className="ri-error-warning-line text-4xl text-red-600" />

          <p className="mt-2 font-semibold text-red-700">
            {error}
          </p>
        </div>
      )}

      {/* Empty result */}
      {!loading &&
        !error &&
        suggestions.length === 0 && (
          <div className="w-full rounded-xl bg-white p-5 text-center">
            <i className="ri-charging-pile-2-line text-4xl text-red-600" />

            <p className="mt-2 font-semibold">
              No charging stations found nearby.
            </p>
          </div>
        )}

      {/* Station list */}
      {!loading &&
        suggestions.map((station, index) => (
          <div
            key={
              station._id ||
              `${station.latitude}-${station.longitude}-${index}`
            }
            onClick={() => handleCardClick(station)}
            className="my-2 flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border-2 border-slate-500 bg-white p-3 transition active:border-black"
          >
            {/* Station information */}
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-3xl bg-slate-100">
                <img
                  className="h-full w-full object-cover"
                  src={getStationImage(station)}
                  alt={station.name || "Charging station"}
                  onError={(event) => {
                    if (
                      event.currentTarget.src.endsWith(
                        "/icons/placeholder.png"
                      )
                    ) {
                      return;
                    }

                    event.currentTarget.src =
                      "/icons/placeholder.png";
                  }}
                />
              </div>

              <div className="min-w-0">
                <button
                  type="button"
                  className="block max-w-full truncate text-left text-xl font-bold text-blue-800 hover:underline"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleStationDetails(station);
                  }}
                >
                  {station.name || "Unnamed station"}
                </button>

                <p className="mt-1 text-xs text-slate-500">
                  Tap name for details, card for route
                </p>
              </div>
            </div>

            {/* Station stats */}
            <div className="shrink-0 text-right">
              <h4 className="text-sm font-semibold">
                {station.portsAvailable ?? 0} Ports
              </h4>

              <h4 className="text-sm font-semibold">
                {station.distance != null
                  ? `${station.distance} KMs`
                  : "Distance unavailable"}
              </h4>
            </div>
          </div>
        ))}
    </div>
  );
};

export default LocationSearchPanel;

