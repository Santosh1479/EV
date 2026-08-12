import React, { useEffect } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserProtectWrapper = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const token =
        (await AsyncStorage.getItem("token")) ||
        (await AsyncStorage.getItem("authToken"));

      if (!token) {
        router.replace("/login/UserLogin");
      }
    };

    checkAuth();
  }, [router]);

  return <>{children}</>;
};

export default UserProtectWrapper