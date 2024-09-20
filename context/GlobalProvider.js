import React, { createContext, useContext, useEffect, useState } from "react";
import { setupLocationTracking } from '../app/services/locationService';
import { getCurrentUser } from "../lib/appwrite";

const GlobalContext = createContext();
export const useGlobalContext = () => useContext(GlobalContext);

const GlobalProvider = ({ children }) => {
  const [isLogged, setIsLogged] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const res = await getCurrentUser();
        if (res) {
          setIsLogged(true);
          setUser(res);
          // Initialize location tracking when user is authenticated
          try {
            await setupLocationTracking();
            console.log("Location tracking set up successfully");
          } catch (error) {
            console.error("Failed to setup location tracking:", error);
          }
        } else {
          setIsLogged(false);
          setUser(null);
        }
      } catch (error) {
        console.log(error);
        setIsLogged(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  return (
    <GlobalContext.Provider
      value={{
        isLogged,
        setIsLogged,
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export default GlobalProvider;


// import React, { createContext, useContext, useEffect, useState } from "react";
// import { setupLocationTracking } from '../app/services/locationService';

// import { getCurrentUser } from "../lib/appwrite";

// const GlobalContext = createContext();
// export const useGlobalContext = () => useContext(GlobalContext);

// const GlobalProvider = ({ children }) => {
//   const [isLogged, setIsLogged] = useState(false);
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     getCurrentUser()
//       .then((res) => {
//         if (res) {
//           setIsLogged(true);
//           setUser(res);
//           // Initialize location tracking when user is authenticated
//            // Initialize location tracking when user is authenticated
//           try {
//             await setupLocationTracking();
//             console.log("Location tracking set up successfully");
//           } catch (error) {
//             console.error("Failed to setup location tracking:", error);
//           }
          
//         } else {
//           setIsLogged(false);
//           setUser(null);
//         }
//       })
//       .catch((error) => {
//         console.log(error);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, []);

//   return (
//     <GlobalContext.Provider
//       value={{
//         isLogged,
//         setIsLogged,
//         user,
//         setUser,
//         loading,
//       }}
//     >
//       {children}
//     </GlobalContext.Provider>
//   );
// };

// export default GlobalProvider;
