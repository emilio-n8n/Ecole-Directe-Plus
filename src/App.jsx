import { useState, useEffect, useRef, createContext, useMemo, lazy, Suspense } from "react";
import {
    Navigate,
    createBrowserRouter,
    RouterProvider
} from "react-router-dom";

import { getISODate, sendToWebhook } from "./utils/utils";
import { File, fetchFile } from "./utils/file";
import {
    sortGrades,
    sortNextHomeworks,
    sortDayHomeworks,
    sortMessageFolders,
    sortMessages,
    sortMessageContent,
    sortSchoolLife,
} from "./utils/dataHandlers";

import "./App.css";

import Root from "./components/Root";
import Login from "./components/Login/Login";
import ErrorPage from "./components/Errors/ErrorPage";
import Canardman from "./components/Canardman/Canardman";
import AppLoading from "./components/generic/Loading/AppLoading";
import LandingPage from "./components/LandingPage/LandingPage";
import EdpUnblock from "./components/EdpUnblock/EdpUnblock"
import { useCreateNotification } from "./components/generic/PopUps/Notification";
import { calcAverage, calcCategoryAverage, calcGeneralAverage } from "./utils/gradesTools";
import { areOccurenciesEqual, createUserLists, encrypt, decrypt, getBrowser } from "./utils/utils";
import { getCurrentSchoolYear } from "./utils/date";
import EdpuLogo from "./components/graphics/EdpuLogo";
import { tr } from "date-fns/locale";

// CODE-SPLITTING - DYNAMIC IMPORTS
const Lab = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Lab } }));
const Museum = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Museum } }));
const UnsubscribeEmails = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.UnsubscribeEmails } }));
const Header = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Header } }));
const Dashboard = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Dashboard } }));
const Grades = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Grades } }));
const Homeworks = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Homeworks } }));
const Timetable = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Timetable } }));
const Messaging = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Messaging } }));
const Settings = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Settings } }));
const Account = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Account } }));
const Feedback = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.Feedback } }));
const LoginBottomSheet = lazy(() => import("./components/app/CoreApp").then((module) => { return { default: module.LoginBottomSheet } }));


function consoleLogEDPLogo() {
    console.log(`%c
                   /%&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
               #&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
            /&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
           &&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
         /&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
         %&&&&%/                                            
        /&&/                                                
        %/    /#&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
           /%&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
          %&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
         %&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
        (&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
        &&&&&&&&&&&&/                                       
        &&&&&&&&&&&&\\                                       
        (&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
         %&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
          %&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
           \\&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
              \\%&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&    
    
                Looking for curious minds. Are you in?      
          https://github.com/Magic-Fishes/Ecole-Directe-Plus 
`, `color: ${window.matchMedia('(prefers-color-scheme: dark)').matches ? "#B8BEFD" : "#4742df"}`);
    console.log("%cWarning!\n%cUsing this console may allow attackers to impersonate you and steal your information using an attack called Self-XSS. Do not enter or paste code that you do not understand.",
        `color:${window.matchMedia('(prefers-color-scheme: dark)').matches ? "rgb(223, 98, 98)" : "rgb(200, 80, 80)"};font-size:1.5rem;-webkit-text-stroke: 1px black;font-weight:bold`, "");
}

consoleLogEDPLogo();

const currentEDPVersion = "0.4.1";
const apiVersion = "4.69.1";

// secret webhooks
const carpeConviviale = "CARPE_CONVIVIALE_WEBHOOK_URL";
const sardineInsolente = "SARDINE_INSOLENTE_WEBHOOK_URL";
const thonFrustre = "THON_FRUSTRE_WEBHOOK_URL";

// const lsIdName = encrypt("userIds")
const lsIdName = "encryptedUserIds"
const WINDOW_WIDTH_BREAKPOINT_MOBILE_LAYOUT = 450; // px
const WINDOW_WIDTH_BREAKPOINT_TABLET_LAYOUT = 869; // px

const referencedErrors = {
    "250": "Authentification à deux facteurs requise",
    "505": "Identifiant et/ou mot de passe invalide",
    "522": "Identifiant et/ou mot de passe invalide",
    "74000": "La connexion avec le serveur a échoué, réessayez dans quelques minutes",
    "202": "accountCreationError",
}

//default settings
const defaultSettings = {
    keepLoggedIn: false,
    displayTheme: "auto",
    displayMode: "quality",
    isSepiaEnabled: false,
    isHighContrastEnabled: false,
    isGrayscaleEnabled: false,
    isPhotoBlurEnabled: false,
    isPartyModeEnabled: true,
    isPeriodEventEnabled: true,
    isStreamerModeEnabled: false,
    gradeScale: 20,
    isGradeScaleEnabled: false,
    schoolYear: getCurrentSchoolYear(),
    isSchoolYearEnabled: false,
    lucioleFont: false,
    windowArrangement: [],
    allowWindowsArrangement: true,
    dynamicLoading: true,
    shareSettings: true,
    negativeBadges: false,
    allowAnonymousReports: true,
    isDevChannel: false,
    selectedChart: 0
}

const browserExtensionDownloadLink = {
    Opera: "https://chromewebstore.google.com/detail/ecole-directe-plus-unbloc/jglboadggdgnaicfaejjgmnfhfdnflkb?hl=fr",
    Chromium: "https://chromewebstore.google.com/detail/ecole-directe-plus-unbloc/jglboadggdgnaicfaejjgmnfhfdnflkb?hl=fr",
    Chrome: "https://chromewebstore.google.com/detail/ecole-directe-plus-unbloc/jglboadggdgnaicfaejjgmnfhfdnflkb?hl=fr",
    Firefox: "https://unblock.ecole-directe.plus/edpu-0.1.4.xpi",
    Edge: "https://microsoftedge.microsoft.com/addons/detail/ecole-directe-plus-unbloc/bghggiemmicjhglgnilchjfnlbcmehgg",
    Safari: "/edp-unblock"
}

const userBrowser = getBrowser();

const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

// get data from localstorage
const tokenFromLs = localStorage.getItem("token") ?? "";
const token2faFromLs = localStorage.getItem("token2fa") ?? "";
const accountListFromLs = JSON.parse(localStorage.getItem("accountsList") ?? "[]");
const oldActiveAccountFromLs = parseInt(localStorage.getItem("oldActiveAccount") ?? 0);
let userSettingsFromLs = JSON.parse((localStorage.getItem("userSettings") ?? "[{}]"));
const keepLoggedInFromLs = getSetting("keepLoggedIn", 0, true);
const A2FInfoFromLS = JSON.parse((localStorage.getItem("A2FInfo") ?? "{}"));
let userIdsFromLs;
if (keepLoggedInFromLs) {
    userIdsFromLs = JSON.parse(decrypt(localStorage.getItem(lsIdName)) ?? "{}");
} else {
    userIdsFromLs = {};
}

function getSetting(setting, accountIdx, isGlobal = false) {
    if (isGlobal) {
        const globalSettingsFromLs = JSON.parse((localStorage.getItem("globalSettings") ?? "{}"));
        return globalSettingsFromLs[setting] ?? defaultSettings[setting];
    } else if (userSettingsFromLs[accountIdx]) {
        userSettingsFromLs = JSON.parse((localStorage.getItem("userSettings") ?? "{}"));
        return ((userSettingsFromLs[accountIdx] && userSettingsFromLs[accountIdx][setting]) ?? defaultSettings[setting]);
    }
    return defaultSettings[setting];
}


function initSettings(accountList) {
    // comment ajouter un setting :
    // userSettings ici ; defaultSettings
    const userSettings = [];
    for (let i = 0; i < (accountList?.length || 1); i++) { //Si au login, il y a aucun compte d'enregistré on considère qu'il y a un seul compte
        userSettings.push({
            displayTheme: {
                value: getSetting("displayTheme", i),
                values: ["light", "auto", "dark"]
            },
            displayMode: {
                value: getSetting("displayMode", i),
                values: ["quality", "balanced", "performance"]
            },
            selectedChart: {
                value: getSetting("selectedChart", i),
                values: [0, 1, 2]
            },
            isSepiaEnabled: {
                value: getSetting("isSepiaEnabled", i),
            },
            isHighContrastEnabled: {
                value: getSetting("isHighContrastEnabled", i),
            },
            isGrayscaleEnabled: {
                value: getSetting("isGrayscaleEnabled", i),
            },
            isPhotoBlurEnabled: {
                value: getSetting("isPhotoBlurEnabled", i),
            },
            isPartyModeEnabled: {
                value: getSetting("isPartyModeEnabled", i),
            },
            isPeriodEventEnabled: {
                value: getSetting("isPeriodEventEnabled", i),
            },
            isStreamerModeEnabled: {
                value: getSetting("isStreamerModeEnabled", i),
            },
            gradeScale: {
                value: getSetting("gradeScale", i),
                min: 1,
                max: 100,
            },
            isGradeScaleEnabled: {
                value: getSetting("isGradeScaleEnabled", i),
            },
            schoolYear: {
                value: getSetting("schoolYear", i),
            },
            isSchoolYearEnabled: {
                value: getSetting("isSchoolYearEnabled", i),
            },
            lucioleFont: {
                value: getSetting("lucioleFont", i),
            },
            windowArrangement: {
                value: getSetting("windowArrangement", i),
            },
            allowWindowsArrangement: {
                value: getSetting("allowWindowsArrangement", i),
            },
            dynamicLoading: {
                value: getSetting("dynamicLoading", i),
            },
            negativeBadges: {
                value: getSetting("negativeBadges", i),
            },
            allowAnonymousReports: {
                value: getSetting("allowAnonymousReports", i),
            }
        })
    }
    return userSettings;
}

function initData(length) {
    return Array.from({ length: length }, (_) => ({
        badges: {
            star: 0,
            bestStudent: 0,
            greatStudent: 0,
            stonks: 0,
            keepOnFire: 0,
            meh: 0,
        },
    }))
}

// optimisation possible avec useCallback
export const AppContext = createContext(null);

let promptInstallPWA = () => { };
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); promptInstallPWA = () => event.prompt() });
window.addEventListener("appinstalled", () => { promptInstallPWA = null });

export default function App({ edpFetch }) {
    // global account data
    const [tokenState, setTokenState] = useState(tokenFromLs); // token d'identification
    const [token2faState, setToken2faState] = useState(token2faFromLs); // token d'identification 2FA
    const [accountsListState, setAccountsListState] = useState(accountListFromLs); // liste des profils sur le compte (notamment si compte parent)
    const [userIds, setUserIds] = useState(userIdsFromLs); // identifiants de connexion (username, pwd)
    const [bufferUserIds, setBufferUserIds] = useState(userIdsFromLs); // identifiants de connexion (username, pwd) | uniquement pour la gestion de la reconnexion auto après l'A2F
    const [A2FInfo, setA2FInfo] = useState(A2FInfoFromLS); // informations d'authentification à deux facteurs (cn, cv)
    const [requireA2F, setRequireA2F] = useState(false); // trigger or not the A2F pop-up
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [activeAccount, setActiveAccount] = useState(oldActiveAccountFromLs); // compte actuellement sélectionné (utile pour les comptes parents)
    const [keepLoggedIn, setKeepLoggedIn] = useState(getSetting("keepLoggedIn", activeAccount, true)); // fonctionnalité "rester connecté"

    // user settings
    const [userSettings, setUserSettings] = useState(initSettings(accountListFromLs)); // paramètres propre à chaque profil du compte
    const [shareSettings, setShareSettings] = useState(getSetting("shareSettings", activeAccount, true));
    const [isDevChannel, setIsDevChannel] = useState(getSetting("isDevChannel", activeAccount, true)); // canal dev: redirige vers l'URL dev.ecole-directe.plus où on déploie beaucoup plus régulièrement les mises à jour, mais qui peut être un peu instable

    // user data (chaque information relative à l'utilisateur est stockée dans un State qui lui est propre)
    const [grades, setGrades] = useState([]);
    const [homeworks, setHomeworks] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [schoolLife, setSchoolLife] = useState([]);
    const [userData, setUserData] = useState([]); // informations annexes de l'utilisateur qui ne relèvent pas directement d'un JSON issue de l'API d'ED que l'on a préalablement filtré et trié

    // utils
    const [oldTimeoutId, setOldTimeoutId] = useState(null);
    const [isMobileLayout, setIsMobileLayout] = useState(() => window.matchMedia(`(max-width: ${WINDOW_WIDTH_BREAKPOINT_MOBILE_LAYOUT}px)`).matches); // permet de modifier le layout en fonction du type d'écran pour améliorer le responsive
    const [isTabletLayout, setIsTabletLayout] = useState(() => window.matchMedia(`(max-width: ${WINDOW_WIDTH_BREAKPOINT_TABLET_LAYOUT}px)`).matches);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [isEDPUnblockInstalled, setIsEDPUnblockInstalled] = useState(true);
    const [isEDPUnblockActuallyInstalled, setIsEDPUnblockActuallyInstalled] = useState(false);
    const [isStandaloneApp, setIsStandaloneApp] = useState(((window.navigator.standalone ?? false) || window.matchMedia('(display-mode: standalone)').matches)); // détermine si l'utilisateur a installé le site comme application, permet également de modifier le layout en conséquence
    const [appKey, setAppKey] = useState(() => crypto.randomUUID());
    const [proxyError, setProxyError] = useState(false); // en cas d'erreur sur le serveur proxy d'EDP (toutes les requêtes passent par lui pour contourner les restrictions d'EcoleDirecte)

    // diverse
    const abortControllers = useRef([]); // permet d'abort tous les fetch en cas de déconnexion de l'utilisateur pendant une requête
    const loginAbortControllers = useRef([]); // permet d'abort tous les fetch en cas de déconnexion de l'utilisateur pendant une requête
    const entryURL = useRef(window.location.href);
    const actualDisplayTheme = getActualDisplayTheme(); // thème d'affichage réel (ex: dark ou light, et non pas auto)
    const createNotification = useCreateNotification();


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                                                                                  //
    //                                                                                  Gestion Storage                                                                                 //
    //                                                                                                                                                                                  //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /////////// SETTINGS ///////////

    function changeUserSettings(setting, value, accountIdx = activeAccount) {
        setUserSettings((oldSettings) => {
            const newSettings = [...oldSettings];
            newSettings[accountIdx][setting].value = value;
            return newSettings;
        })
        if (shareSettings) {
            syncSettings();
        }
    }

    function syncSettings() {
        setUserSettings((oldSettings) => {
            const selectedUserSetting = oldSettings[activeAccount]
            const newSettings = Array.from({ length: oldSettings.length }, (_) => structuredClone(selectedUserSetting));
            return newSettings;
        })
    }

    function getUserSettingValue(setting) {
        if (userSettings[activeAccount] && userSettings[activeAccount][setting]) {
            return userSettings[activeAccount][setting].value;
        } else {
            return undefined;
        }
    }

    function getUserSettingObject(setting) {
        return userSettings[activeAccount][setting]
    }

    function useUserSettings(setting = "") {
        /*
            use as a hook like location
            
            EX :
            userSettings = useUserSettings()
            console.log(userSettings.get("displayTheme"))
            > Value of displayTheme of current user


            You can pass the setting you want in arguments of useUserSettings

            EX : 
            userDisplayTheme = useUserSettings("displayTheme")
            console.log(userDisplayTheme.get())
            > Value of displayTheme of current user
        */
        if (setting === "") {
            return {
                set: changeUserSettings, // set((oldState) => newState = oldState)
                get: getUserSettingValue, // get the value
                object: getUserSettingObject, // get the entire object
            }
        } else {
            return {
                set: (value) => { changeUserSettings(setting, value) },
                get: () => getUserSettingValue(setting),
                object: () => getUserSettingObject(setting),
            }
        }
    }


    const globalSettings = {
        keepLoggedIn: {
            value: keepLoggedIn,
            set: setKeepLoggedIn,
        },
        shareSettings: {
            value: shareSettings,
            set: setShareSettings,
        },
        isDevChannel: {
            value: isDevChannel,
            set: setIsDevChannel
        },
    }

    useEffect(() => {
        const lsGlobalSettings = {};
        for (const i in globalSettings) {
            lsGlobalSettings[i] = globalSettings[i].value ?? defaultSettings[i];
        }
        localStorage.setItem("globalSettings", JSON.stringify(lsGlobalSettings));

        const handleStorageChange = () => {
            const newLsGlobalSettings = JSON.parse(localStorage.getItem("globalSettings"))
            if (!areOccurenciesEqual(newLsGlobalSettings, globalSettings)) {
                for (const i in globalSettings) {
                    globalSettings[i].set(newLsGlobalSettings[i])
                }
            }
        }
        window.addEventListener("storage", handleStorageChange)

        return (() => {
            window.removeEventListener("storage", handleStorageChange);
        });
    }, [keepLoggedIn,
        shareSettings,
        isDevChannel])

    useEffect(() => {
        // handle storing into localStorage
        if (userSettings?.length > 0) {
            const lsUserSettings = [];
            for (let i = 0; i < userSettings.length; i++) {
                lsUserSettings[i] = {};
                for (let n in userSettings[i]) {
                    lsUserSettings[i][n] = (userSettings[i] ? (userSettings[i][n]?.value ?? defaultSettings[n]) : defaultSettings[n]);
                }
            }
            localStorage.setItem("userSettings", JSON.stringify(lsUserSettings));
        }
    }, [userSettings]);

    useEffect(() => {
        if (tokenState !== "") {
            localStorage.setItem("token", tokenState);
        }
    }, [tokenState]);

    useEffect(() => {
        if (token2faState !== "") {
            localStorage.setItem("token2fa", token2faState);
        }
    }, [token2faState]);

    useEffect(() => {
        if (accountsListState?.length > 0) {
            localStorage.setItem("accountsList", JSON.stringify(accountsListState));
        }
    }, [accountsListState]);

    useEffect(() => {
        const handleStorageChange = () => {
            // logout if the user has logout in any tab
            if (accountsListState?.length > 0 && localStorage.getItem("accountsList") === null) {
                logout();
                return 0;
            }
            // handle getting from localStorage if it changes
            applyConfigFromLocalStorage();
            if (accountsListState?.length > 0) {
                const newSettings = initSettings(accountsListState)
                if (!areOccurenciesEqual(newSettings, userSettings)) {
                    setUserSettings(newSettings);
                }
            }
        }

        const timeoutHandleStorageChange = () => {
            setTimeout(() => handleStorageChange(), 0); // timeout to prevent issues due to react async behavior
        }

        window.addEventListener("storage", timeoutHandleStorageChange)

        return (() => {
            window.removeEventListener("storage", timeoutHandleStorageChange);
        });
    }, [accountsListState, userSettings, tokenState]);


    useEffect(() => {
        if (shareSettings) {
            syncSettings();
        }
    }, [shareSettings])

    useEffect(() => {
        localStorage.setItem("oldActiveAccount", activeAccount)
    }, [activeAccount]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data.type === "EDP_UNBLOCK") {
                console.log("EDP Unblock v" + event.data.payload.version + " installed");
                setIsEDPUnblockActuallyInstalled(true);
            }
        };

        window.addEventListener("message", handleMessage, false);
        return () => {
            window.removeEventListener("message", handleMessage, false);
        }
    }, [])

    // fonctions de type utils pour modifier le userData
    function changeUserData(data, value) {
        setUserData((oldData) => {
            const newData = [...oldData];
            if (!newData[activeAccount]) {
                newData[activeAccount] = {};
            }
            newData[activeAccount][data] = value;
            return newData;
        })
    }

    function getUserData(data) {
        return (userData ? (userData[activeAccount] ? userData[activeAccount][data] : undefined) : undefined);
    }

    const useUserData = (data = "") => (
        data
            ? { set: (value) => changeUserData(data, value), get: () => getUserData(data) } // If the data is choosen, there is no need to get the full
            : { set: changeUserData, get: getUserData }
    )


    // gestion de la désactivation automatique du "rester connecté"
    useEffect(() => {
        if (!keepLoggedIn) {
            localStorage.removeItem(lsIdName);
        } else if (userIds.username && userIds.password) {
            localStorage.setItem(lsIdName, encrypt(JSON.stringify({ username: userIds.username, password: userIds.password })));
        } else {
            setIsLoggedIn(false);
        }
    }, [keepLoggedIn]);

    // réapplique les informations sauvegardées dans le localStorage (certaines ont déjà été appliquées à l'initialisation des States)
    function applyConfigFromLocalStorage() {
        // informations de connexion
        const token = localStorage.getItem("token");
        if (token && token !== "none" && token !== tokenState) {
            setTokenState(token);
        }
        const accountsList = JSON.parse(localStorage.getItem("accountsList"));
        if (accountsList && accountsList.length > 0 && !areOccurenciesEqual(accountsList, accountsListState)) {
            setAccountsListState(accountsList);
        }
    }

    // sécurité qui empêche la reconnexion automatique s'il manque au moins un identifiant
    useEffect(() => {
        if (!userIds.username || !userIds.password) {
            console.log("USERIDS EMPTY -> DISABLING KEEP LOGGED IN")
            setKeepLoggedIn(false);
        }
    }, [userIds]);

    useEffect(() => {
        // gestion synchronisatin du localStorage s'il est modifié dans un autre onglet
        applyConfigFromLocalStorage();

        // Gestion thème
        const handleOSThemeChange = () => {
            console.clear();
            consoleLogEDPLogo();
            if (getUserSettingValue("displayTheme") === "auto") {
                document.documentElement.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
                document.documentElement.classList.remove(window.matchMedia('(prefers-color-scheme: dark)').matches ? "light" : "dark");
                toggleThemeTransitionAnimation();
            }
        }
        prefersDarkMode.addEventListener('change', handleOSThemeChange);

        return (() => {
            prefersDarkMode.removeEventListener('change', handleOSThemeChange);
        });
    }, []);

    // Applique les informations du localStorage dès la première frame pour éviter certains bugs
    const isFirstFrame = useRef(true);
    if (isFirstFrame.current) {
        applyConfigFromLocalStorage();
        isFirstFrame.current = false;
    }

    // TABLET / MOBILE LAYOUT MANAGEMENT
    useEffect(() => {
        // gère l'état de isMobileLayout en fonction de la largeur de l'écran
        const handleWindowResize = () => {
            // setIsMobileLayout(window.innerWidth <= WINDOW_WIDTH_BREAKPOINT_MOBILE_LAYOUT);
            // setIsTabletLayout(window.innerWidth <= WINDOW_WIDTH_BREAKPOINT_TABLET_LAYOUT);
            setIsMobileLayout(window.matchMedia(`(max-width: ${WINDOW_WIDTH_BREAKPOINT_MOBILE_LAYOUT}px)`).matches);
            setIsTabletLayout(window.matchMedia(`(max-width: ${WINDOW_WIDTH_BREAKPOINT_TABLET_LAYOUT}px)`).matches);

            if (getBrowser() !== "Firefox") {
                // gestion du `zoom` sur petits écrans afin d'améliorer la lisibilité et le layout global
                if (window.innerWidth >= 869 && window.innerWidth < 1250) {
                    if (window.innerWidth >= 995) {
                        document.documentElement.style.zoom = (.2 / 170) * window.innerWidth - .47;
                    } else {
                        document.documentElement.style.zoom = .7;
                    }

                    let isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
                    if (isSafari) {
                        const newFontSize = (.125 / 170) * window.innerWidth - .294;
                        if (newFontSize < 8) {
                            document.documentElement.style.fontSize = "8px";
                        } else if (newFontSize > 10) {
                            document.documentElement.style.fontSize = "";
                        } else {
                            document.documentElement.style.fontSize = newFontSize + "em";
                        }
                    }
                } else if (window.innerHeight < 900) {
                    if (window.innerHeight >= 650) {
                        document.documentElement.style.zoom = (.35 / 350) * window.innerHeight + .1;
                    } else {
                        document.documentElement.style.zoom = .75;
                    }
                } else {
                    document.documentElement.style.fontSize = "";
                    document.documentElement.style.zoom = "";
                }
            }
        }

        window.addEventListener("resize", handleWindowResize);
        handleWindowResize();

        return () => {
            window.removeEventListener("resize", handleWindowResize);
        }
    }, []);


    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                                                                                  //
    //                                                                                  Data Functions                                                                                 //
    //                                                                                                                                                                                  //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function addNewGrade({ value, coef, scale, name, type, subjectKey, periodKey }) {
        /** 
         * Ajoute une nouvelle note à l'utilisateur (simulation)
         * - value : valeur de la note
         * - coef : coefficient de la note
         * - scale : note maximum posible
         * - name : nom du devoir
         * - type : type de devoir (DS, DM, ...)
         */
        const sortedGrades = getUserData("sortedGrades")
        sortedGrades[periodKey].subjects[subjectKey].grades.push({
            value: value,
            coef: coef,
            scale: scale,
            name: name,
            badges: [],
            classAverage: "N/A",
            classMin: "N/A",
            classMax: "N/A",
            date: new Date(),
            elementType: "grade",
            entryDate: new Date(),
            examCorrectionSRC: "",
            examSubjectSRC: "",
            id: crypto.randomUUID(),
            isReal: false,
            skill: [],
            subjectName: sortedGrades[periodKey].subjects[subjectKey].name,
            type: type,
            upTheStreak: false,
            subjectKey: subjectKey,
            periodKey: periodKey,
        })
        changeUserData("sortedGrades", sortedGrades);
        updatePeriodGrades(periodKey)
    }

    function deleteFakeGrade(UUID, subjectKey, periodKey) {
        const newGrades = { ...getUserData("sortedGrades") }
        newGrades[periodKey].subjects[subjectKey].grades = newGrades[periodKey].subjects[subjectKey].grades.filter((el) => el.id !== UUID)
        changeUserData("sortedGrades", newGrades);
        updatePeriodGrades(periodKey)
    }

    function updatePeriodGrades(periodKey) {
        const sortedGrades = getUserData("sortedGrades");
        const period = sortedGrades[periodKey];

        for (const subject in period.subjects) {
            if (!subject.includes("category")) {
                period.subjects[subject].average = calcAverage(period.subjects[subject].grades);
            } else {
                period.subjects[subject].average = calcCategoryAverage(period, period.subjects[subject]);
            }
        }
        period.generalAverage = calcGeneralAverage(period)
        sortedGrades[periodKey] = period;
        changeUserData("sortedGrades", sortedGrades);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                                                                                  //
    //                                                                                  Fetch Functions                                                                                 //
    //                                                                                                                                                                                  //
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    function requireLogin() {
        // Affiche la BottomSheet de reconnexion
        setIsLoggedIn(false);
        localStorage.setItem("token", "none");
    }

    function loginFromOldAuthInfo(token, accountsList) {
        // En cas de rafraichissement de la page, recovery des informations à partir du token s'il n'a pas expiré
        if (!!token && token !== "none" && accountsList.length > 0) {
            console.log("LOGGED IN FROM OLD TOKEN & ACCOUNTSLIST");
            setUserInfo(token, accountsList);
            setIsLoggedIn(true);
        } else {
            console.log("NO ACCOUNTSLIST: LOGGED OUT");
            logout();
        }
    }

    const fakeLogin = () => {
        const fakeToken = "thisisafaketoken";
        const fakeAccountsList = [
            {
                accountType: "E",
                id: "0001",
                firstName: "Guest",
                lastName: "",
                email: "ecole.directe.plus@gmail.com",
                picture: "https://i.ibb.co/GC5f9RL/IMG-1124.jpg",
                schoolName: "École de la République",
                class: ["Pcpt", "Précepteur d'exception"]
            },
        ];
        resetUserData()
        setUserInfo(fakeToken, fakeAccountsList)
    }

    function handleEdBan() {
        // Will summon a notification with JSX in it
        createNotification(<>
            <h4>
                Installez Ecole Directe Plus Unblock
            </h4>
            <hr />
            <div className="edpu-notification-description">
                <EdpuLogo />
                <p>Ecole Directe Plus a besoin de son extension de navigateur pour fonctionner. (fourni un accès continu à l'API d'EcoleDirecte)</p>
            </div>
            <hr />
            <div className="extension-download-link">
                <a href="/edp-unblock#about">En savoir plus</a>
                <a href={browserExtensionDownloadLink[userBrowser]} target={(!["Safari", "Firefox"].includes(userBrowser) ? "_blank" : "")}>Télécharger</a>
            </div>
        </>, { customClass: "extension-warning", timer: "infinite" })
    }

    async function setupGtkToken() {
        await new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.data && event.data.type === "EDPU_MESSAGE") {
                    window.removeEventListener("message", handleMessage);
                    const message = event.data.payload;
                    console.log(message);
                    if (message.action === "gtkRulesUpdated") {
                        resolve();
                    } else if (message.action === "noGtkCookie" || message.action === "noCookie") {
                        reject(new Error("EDPUNoCookie"));
                    }
                }
            }

            window.addEventListener("message", handleMessage);
            fetch(`https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=${apiVersion}`)
                .then(() => {
                    setTimeout(() => {
                        window.removeEventListener("message", handleMessage);
                        reject(new Error("NoEDPUResponse"));
                    }, 3000);
                })
                .catch(() => {
                    if (navigator.onLine)
                        // the error is probably due to the extension not being installed
                        setIsEDPUnblockInstalled(false);
                });
        }).catch((error) => {
            console.error(error);
            throw error;
        });
    }

    async function fetchLogin(username, password, keepLoggedIn, callback, controller = (new AbortController())) {
        if (isLoggedIn) {
            return
        }

        loginAbortControllers.current.push(controller);
        // guest management
        if (username === "guest" && password === "secret") {
            fakeLogin();
            return 0;
        }

        const messages = {
            submitButtonText: "",
            submitErrorMessage: ""
        };

        try {
            await setupGtkToken();
        } catch (error) {
            console.log(Object.entries(error));
            console.error(error);
            messages.submitButtonText = "Échec de la connexion";
            if (error.message === "NoEDPUResponse") {
                messages.submitErrorMessage = "Nous n'avons pas réussi à communiquer avec l'extension EDP Unblock, vérifiez qu'elle soit à jour et/ou qu'elle ait les permissions nécessaires.";
            } else if (error.message === "EDPUNoCookie") {
                messages.submitErrorMessage = "L'extension EDP Unblock n'a pas réussi à accéder aux cookies nécessaires pour votre connexion, vérifiez qu'elle soit à jour et/ou qu'elle ait les permissions nécessaires.";
            } else {
                messages.submitErrorMessage = "Il y a eu un problème lors de l'obtention des cookies nécessaires à votre connexion, réessayez plus tard.";
            }
            callback(messages);
            throw error;
        }

        const payload = {
            identifiant: encodeURIComponent(username),
            motdepasse: encodeURIComponent(password),
            isReLogin: false,
            ...A2FInfo,
            fa: Object.keys(A2FInfo).length > 0 ? [A2FInfo] : []
        }

        try {
            const nresponse = await fetch(`https://api.ecoledirecte.com/v3/login.awp?v=${apiVersion}`, {
                body: "data=" + JSON.stringify(payload),
                method: "POST",
                signal: controller.signal,
                referrerPolicy: "no-referrer",
                headers: {
                  "X-Token": tokenState,
                  "2FA-Token": token2faState,
                  "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            const text = await nresponse.text();
            if (!text) {
                setIsEDPUnblockInstalled(false);
                return;
            }
            const response = JSON.parse(text);

            const token = nresponse.headers.get("x-token")
            const token2fa = nresponse.headers.get("2fa-token")

            // GESTION DATA
            let statusCode = response.code;
            if (statusCode === 200) {
                messages.submitButtonText = "Connecté";
                setUserIds({ username: username, password: password })
                if (keepLoggedIn) {
                    localStorage.setItem(lsIdName, encrypt(JSON.stringify({ username: username, password: password })))
                }
                let accountsList = [];
                let accounts = response.data.accounts.find((account) => account.typeCompte !== "P") ?? response.data.accounts[0];
                if (response.data.accounts.some((account) => account.typeCompte === "P")) {
                    messages.submitButtonText = "Échec de la connexion";
                    messages.submitErrorMessage = "Les comptes enseignants ne sont pas supportés par Ecole Directe Plus";
                    return;
                }
                const accountType = accounts.typeCompte; // collecte du type de compte
                if (accountType === "E") {
                    // compte élève
                    accountsList.push({
                        accountType: "E", // type de compte
                        lastConnection: accounts.lastConnexion,
                        id: accounts.id, // id du compte
                        firstName: accounts.prenom, // prénom de l'élève
                        lastName: accounts.nom, // nom de famille de l'élève
                        email: accounts.email, // email du compte
                        picture: accounts.profile.photo, // url de la photo
                        schoolName: accounts.profile.nomEtablissement, // nom de l'établissement
                        class: (accounts.profile.classe ? [accounts.profile.classe.code, accounts.profile.classe.libelle] : ["inconnu", "inconnu"]), // classe de l'élève, code : 1G4, libelle : Première G4
                        modules: accounts.modules
                    });
                } else {
                    // compte parent
                    const email = accounts.email;
                    accounts.profile.eleves.map((account) => {
                        accountsList.push({
                            accountType: "P",
                            lastConnection: accounts.lastConnexion,
                            id: account.id,
                            familyId: accounts.id,
                            firstName: account.prenom,
                            lastName: account.nom,
                            email: email,
                            picture: account.photo,
                            schoolName: account.nomEtablissement,
                            class: (account.classe ? [account.classe.code, account.classe.libelle] : ["inconnu", "inconnu"]), // classe de l'élève, code : 1G4, libelle : Première G4
                            modules: account.modules.concat(accounts.modules) // merge modules with those of parents
                        })
                    });
                }
                // ! : si une edit dans les 3 lignes en dessous, il est probable qu'il faille changer également dans loginFromOldAuthInfo //
                if (accountsListState.length > 0 && (accountsListState.length !== accountsList.length || accountsListState[0].id !== accountsList[0].id)) {
                    resetUserData();
                }
                setUserInfo(token, accountsList);
                setToken2faState(token2fa)
                setIsLoggedIn(true);
            } else {
                // si ED renvoie une erreur
                messages.submitButtonText = "Invalide";
                if (referencedErrors.hasOwnProperty(statusCode)) {
                    messages.submitErrorMessage = referencedErrors[statusCode];
                    if (statusCode === 250) {
                        setBufferUserIds({ username: username, password: password })
                        console.log("A2F required")
                        setA2FInfo({});
                        setRequireA2F(true)
                    }
                    setTokenState(token);
                    setToken2faState(token2fa)

                } else {
                    messages.submitErrorMessage = ("Erreur : " + response.message);
                    const error = {
                        errorMessage: response,
                    };
                    if (getUserSettingValue("allowAnonymousReports")) {
                        sendToWebhook(sardineInsolente, error);
                    }
                }
            }
        }
        catch (error) {
            if (error.name !== 'AbortError') {
                console.error(error);
                messages.submitButtonText = "Échec de la connexion";
                messages.submitErrorMessage = "Error: " + error.message;
            }
        }
        finally {
            loginAbortControllers.current.forEach((e) => { e.abort() })
            callback(messages);
        }
    }

    async function fetchUserTimeline(controller = (new AbortController())) {
        abortControllers.current.push(controller);
        const data = {
            anneeScolaire: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : ""
        }

        edpFetch(`https://api.ecoledirecte.com/v3/eleves/${accountsListState[activeAccount].id}/timeline.awp?verbe=get&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    // "user-agent": navigator.userAgent,
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer"
            },
            "text")
            .then((response) => {
                if (!response) {
                    setIsEDPUnblockInstalled(false);
                } else {
                    return JSON.parse(response);
                }
            })
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 200) {
                    const oldTimeline = structuredClone(timeline);
                    oldTimeline[activeAccount] = response.data;
                    setTimeline(oldTimeline);
                    setTokenState(response.token);
                } else if (code === 520 || code === 525) {
                    // token invalide
                    requireLogin();
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    async function fetchUserGrades(controller = (new AbortController())) {
        abortControllers.current.push(controller);
        const userId = activeAccount;
        const data = {
            anneeScolaire: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : "",
        }
        edpFetch(
            `https://api.ecoledirecte.com/v3/eleves/${accountsListState[userId].id}/notes.awp?verbe=get&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 200) {
                    let usersGrades = structuredClone(grades);
                    usersGrades[userId] = response.data;
                    const sorted = sortGrades(usersGrades, activeAccount);
                    for (const [key, value] of Object.entries(sorted)) {
                        changeUserData(key, value);
                    }
                    setGrades(usersGrades);
                } else if (code === 520 || code === 525) {
                    // token invalide
                    requireLogin();
                } else if (code === 49969) {
                    let usersGrades = structuredClone(grades);
                    import("./data/grades.json").then((module) => {
                        usersGrades[userId] = module.data;
                        setGrades(usersGrades);
                    })
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    async function fetchHomeworks(controller = (new AbortController()), date = "incoming") {
        /**
         * Fetch user homeworks
         * @param controller AbortController
         * @param date fetch the specified date (Date object) ; default value: "incoming": will fetch the incoming homeworks 
         */
        abortControllers.current.push(controller);
        const userId = activeAccount;

        let endpoint;
        if (date === "incoming") {
            endpoint = "cahierdetexte";
        } else {
            endpoint = "cahierdetexte/" + getISODate(date);
        }
        if (accountsListState[activeAccount].firstName === "Guest") {
            if (date === "incoming") {
                import("./data/homeworks.json").then((module) => {
                    const { sortedHomeworks, upcomingAssignments } = sortNextHomeworks(module.data);
                    changeUserData("upcomingAssignments", upcomingAssignments);
                    changeUserData("sortedHomeworks", sortedHomeworks);
                })
            } else {
                import("./data/detailed_homeworks.json").then((module) => {
                    changeUserData("sortedHomeworks", { ...getUserData("sortedHomeworks"), ...sortDayHomeworks({ [module.data.date]: module.data.matieres }) })
                })
            }
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        } else {
            edpFetch(
                `https://api.ecoledirecte.com/v3/Eleves/${accountsListState[userId].id}/${endpoint}.awp?verbe=get&v=${apiVersion}`,
                {
                    method: "POST",
                    headers: {
                        "X-Token": tokenState,
                        "2FA-Token": token2faState,
                    },
                    body: "data={}",
                    signal: controller.signal
                },
                "json"
            )
                .then((response) => {
                    const code = response.code;
                    if (code === 200) {
                        if (date === "incoming") {
                            const { sortedHomeworks, upcomingAssignments } = sortNextHomeworks(response.data);
                            changeUserData("upcomingAssignments", upcomingAssignments);
                            changeUserData("sortedHomeworks", { ...sortedHomeworks, ...getUserData("sortedHomeworks") });
                        } else {
                            changeUserData("sortedHomeworks", { ...getUserData("sortedHomeworks"), ...sortDayHomeworks({ [response.data.date]: response.data.matieres }) });
                        }
                    } else if (code === 520 || code === 525) {
                        // token invalide
                        console.log("INVALID TOKEN: LOGIN REQUIRED");
                        requireLogin();
                    }
                    setTokenState((old) => (response?.token || old));
                })
                .catch((error) => {
                    if (error.message === "Unexpected token 'P', \"Proxy error\" is not valid JSON") {
                        setProxyError(true);
                    } else {
                        console.error(error)
                    }
                })
                .finally(() => {
                    abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
                })
        }
    }

    async function fetchHomeworksSequentially(controller = new AbortController(), date = "incoming") {
        abortControllers.current.push(controller);
        const userId = activeAccount;

        let endpoint;
        if (date === "incoming") {
            endpoint = "cahierdetexte";
        } else {
            endpoint = "cahierdetexte/" + getISODate(date);
        }

        if (accountsListState[activeAccount].firstName === "Guest") {
            if (date === "incoming") {
                const module = await import("./data/homeworks.json");
                const { sortedHomeworks, upcomingAssignments } = sortNextHomeworks(module.data);
                changeUserData("upcomingAssignments", upcomingAssignments);
                changeUserData("sortedHomeworks", sortedHomeworks);
            } else {
                const module = await import("./data/detailed_homeworks.json");
                changeUserData("sortedHomeworks", {
                    ...getUserData("sortedHomeworks"),
                    ...sortDayHomeworks({ [module.data.date]: module.data.matieres })
                });
            }
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        } else {
            try {
                const response = await edpFetch(
                    `https://api.ecoledirecte.com/v3/Eleves/${accountsListState[userId].id}/${endpoint}.awp?verbe=get&v=${apiVersion}`,
                    {
                        method: "POST",
                        headers: {
                            "X-Token": tokenState,
                            "2FA-Token": token2faState,
                        },
                        body: "data={}",
                        signal: controller.signal
                    },
                    "json"
                );
                const responseData = await response;
                const code = responseData.code;
                if (code === 200) {
                    if (date === "incoming") {
                        const { sortedHomeworks, upcomingAssignments } = sortNextHomeworks(responseData.data);
                        changeUserData("upcomingAssignments", upcomingAssignments);
                        changeUserData("sortedHomeworks", {
                            ...sortedHomeworks,
                            ...getUserData("sortedHomeworks")
                        });
                    } else {
                        changeUserData("sortedHomeworks", {
                            ...getUserData("sortedHomeworks"),
                            ...sortDayHomeworks({ [responseData.data.date]: responseData.data.matieres })
                        });
                    }
                } else if (code === 520 || code === 525) {
                    console.log("INVALID TOKEN: LOGIN REQUIRED");
                    requireLogin();
                }
                setTokenState(old => responseData?.token || old);
            } finally {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            }
        }
    }


    async function fetchHomeworksDone({ tasksDone = [], tasksNotDone = [] }, controller = (new AbortController())) {
        /**
         * Change the state of selected homeworks
         * @param tasksDone Tasks switched to true 
         * @param tasksNotDone Tasks switched to false
         * These two paramerters are in a single object 
         * @param controller AbortController
         */
        abortControllers.current.push(controller);
        const userId = activeAccount;

        return edpFetch(
            `https://api.ecoledirecte.com/v3/Eleves/${accountsListState[userId].id}/cahierdetexte.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: "data=" + JSON.stringify({ idDevoirsEffectues: tasksDone, idDevoirsNonEffectues: tasksNotDone }),
                signal: controller.signal
            },
            "json"
        )
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 520 || code === 525) {
                    // token invalide
                    console.log("INVALID TOKEN: LOGIN REQUIRED");
                    requireLogin();
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }


    async function fetchMessages(folderId = 0, controller = (new AbortController())) {

        const oldMessageFolders = useUserData("messageFolders").get();
        if (oldMessageFolders && oldMessageFolders?.length > 0) {
            if (oldMessageFolders.find((item) => item.id === folderId)?.fetchInitiated) {
                return;
            } else {
                oldMessageFolders.find((item) => item.id === folderId).fetchInitiated = true;
                useUserData("messageFolders").set(oldMessageFolders)
            }
        }

        abortControllers.current.push(controller);
        const userId = activeAccount;
        const data = {
            anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-"),
        }
        // handle special folders (this is done that way because special folders are not considered as folders by EcoleDirecte but need to be fetched differently)
        let specialFolderType = "received";
        if (folderId === -1) {
            specialFolderType = "sent";
            // set the folderId to 0 to avoid errors
            folderId = 0;
        } else if (folderId === -2) {
            specialFolderType = "archived";
            folderId = 0;
        } else if (folderId === -4) {
            specialFolderType = "draft";
            folderId = 0;
        }
        edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[userId].accountType === "E" ? "eleves/" + accountsListState[userId].id : "familles/" + accountsListState[userId].familyId}/messages.awp?force=false&typeRecuperation=${specialFolderType}&idClasseur=${folderId}&orderBy=date&order=desc&query=&onlyRead=&getAll=1&verbe=get&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 200) {
                    let oldSortedMessages = useUserData("sortedMessages").get();
                    if (oldSortedMessages === undefined) {
                        oldSortedMessages = [];
                    }

                    // we've added the specialFolderType to the function to handle the special folders (to handle different data path for special folders and special folderId)
                    oldSortedMessages.push(sortMessages(response.data, specialFolderType));
                    // if in oldSortedMessages there is multiple times the same message, we remove the duplicates
                    console.log(oldSortedMessages)
                    oldSortedMessages = oldSortedMessages.flat().filter((item, index, self) => self.findIndex((item2) => item2.id === item.id) === index);
                    console.log(oldSortedMessages)
                    if (specialFolderType === "sent") {
                        // set the folderId back to -1 to than handle the special folders
                        folderId = -1;
                    } else if (specialFolderType === "archived") {
                        folderId = -2;
                    } else if (specialFolderType === "draft") {
                        folderId = -4;
                    }
                    changeUserData("sortedMessages", oldSortedMessages.flat());
                    changeUserData("messageFolders", sortMessageFolders(response.data, useUserData("messageFolders").get(), folderId));
                } else if (code === 520 || code === 525) {
                    // token invalide
                    requireLogin();
                } else if (code === 49969) {
                    // TODO: add data/messages.json for guest user
                    // import("./data/messages.json").then((module) => {
                    //     changeUserData("sortedMessages", sortMessages(module.data));;
                    // })
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    async function fetchMessageContent(id, controller) {
        const oldSortedMessages = useUserData("sortedMessages").get();
        if (oldSortedMessages && oldSortedMessages?.length > 0) {
            const targetMessageIdx = oldSortedMessages.findIndex((item) => item.id === id);
            if (oldSortedMessages[targetMessageIdx].content !== null) {
                return;
            }
        }
        abortControllers.current.push(controller);
        const userId = activeAccount;
        const data = {
            anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-"),
        }

        const mode = (oldSortedMessages.find((item) => item.id === id).folderId === -1 || oldSortedMessages.find((item) => item.id === id).folderId === -4) ? "expediteur" : "destinataire";

        edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[userId].accountType === "E" ? "eleves/" + accountsListState[userId].id : "familles/" + accountsListState[userId].familyId}/messages/${id}.awp?verbe=get&mode=${mode}&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 200) {
                    changeUserData("sortedMessages", sortMessageContent(response.data, useUserData("sortedMessages").get()));
                } else if (code === 520 || code === 525) {
                    // token invalide
                    requireLogin();
                } else if (code === 49969) {
                    // TODO: add data/messages.json for guest user
                    // import("./data/messages.json").then((module) => {
                    //      sortMessageContent(module.data)
                    // })
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    async function fetchMessageMarkAsUnread(ids = [], controller) {
        if (ids.length < 1) {
            return;
        }
        abortControllers.current.push(controller);
        const userId = activeAccount;
        const data = {
            anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-"),
            action: "marquerCommeNonLu",
            ids: ids
        }
        edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[userId].accountType === "E" ? "eleves/" + accountsListState[userId].id : "familles/" + accountsListState[userId].familyId}/messages.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 49969;
                } else {
                    code = response.code;
                }
                if (code === 200) {
                    // message successfully marked as unread
                } else if (code === 520 || code === 525) {
                    // token invalide
                    requireLogin();
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }


    async function fetchSchoolLife(controller = (new AbortController())) {
        abortControllers.current.push(controller);
        const data = {
            anneeScolaire: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : ""
        }

        edpFetch(`https://api.ecoledirecte.com/v3/eleves/${accountsListState[activeAccount].id}/viescolaire.awp?verbe=get&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    // "user-agent": navigator.userAgent,
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer"
            },
            "json")
            .then((response) => {
                let code;
                if (accountsListState[activeAccount].firstName === "Guest") {
                    code = 403;
                } else {
                    code = response.code;
                }
                if (code === 200 || code === 210) { // 210: quand l'utilisateur n'a pas de retard/absence/sanction
                    const oldSchoolLife = structuredClone(schoolLife);
                    oldSchoolLife[activeAccount] = response.data;
                    changeUserData("sortedSchoolLife", sortSchoolLife(oldSchoolLife, activeAccount));
                    setSchoolLife(oldSchoolLife);
                    setTokenState(response.token);
                } else if (code === 520 || code === 525) {
                    // token invalide
                    console.log("INVALID TOKEN: LOGIN REQUIRED");
                    requireLogin();
                } else if (code === 403) {
                    setTokenState((old) => (response.token || old));
                }
            })
            .catch((error) => {
                if (error.message === "Unexpected token 'P', \"Proxy error\" is not valid JSON") {
                    setProxyError(true);
                }
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    function fetchA2F({ method = "get", choice = "", callback = (() => { }), errorCallback = (() => { }), controller = (new AbortController()) }) {
        abortControllers.current.push(controller);
        fetch(
            `https://api.ecoledirecte.com/v3/connexion/doubleauth.awp?verbe=${method}&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: `data=${choice ? JSON.stringify({ choix: choice }) : "{}"}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then(response =>
              response.json().then(json => [response.headers, json])
            )
            .then(([headers, response]) => {
                const rtoken = headers.get("x-token")
                const rtoken2fa = headers.get("2fa-token")

                let code = response.code;
                if (code === 200) {
                    if (method === "post") {
                        setA2FInfo(response.data);
                    }

                    callback(response);
                } else if (code === 520 || code === 525) {
                    console.log("INVALID TOKEN: LOGIN REQUIRED");
                    requireLogin();
                } else {
                    errorCallback(response)
                }
                setTokenState((old) => (rtoken || old));
                setToken2faState((old) => (rtoken2fa || old))
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            })
    }

    async function createFolderStorage(name) {
        const data = {
            libelle: name,
        }
        edpFetch("https://api.ecoledirecte.com/v3/messagerie/classeurs.awp?verbe=post%26v=4.52.0",
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                },
                body: `data=${JSON.stringify(data)}`,
                referrerPolicy: "no-referrer"
            },
        )
    }


    async function fetchAdministrativeDocuments(selectedYear, controller = (new AbortController())) {
        abortControllers.current.push(controller);
        return edpFetch(`https://api.ecoledirecte.com/v3/${accountsListState[activeAccount].accountType === "E" ? "eleves" : "famille"}Documents.awp?archive=${selectedYear}&verbe=get&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "X-Token": tokenState,
                    "2FA-Token": token2faState,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'data={}',
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        )
            .then((response) => {
                let code = response.code;
                if (code === 200) {

                    const formatDocument = (documents) =>
                        documents.map((e) => {
                            const [year, month, day] = e.date.split('-');
                            const formattedDate = `${day}/${month}/${year}`;
                            return new File(e.id, e.type, `${e.libelle}.pdf`, undefined, { date: formattedDate });
                        });

                    const administrativeDocuments = formatDocument(response.data?.administratifs ?? []);
                    const notesDocuments = formatDocument(response.data?.notes ?? []);
                    const vieScolaireDocuments = formatDocument(response.data?.viescolaire ?? []);
                    const entrepriseDocuments = formatDocument(response.data?.entreprises ?? []);
                    const facturesDocuments = formatDocument(response.data?.factures ?? []);
                    // const insReinsDocuments = formatDocument(response.data.inscriptionsReinscriptions);


                    const responseDocuments = {
                        administratifs: administrativeDocuments,
                        notes: notesDocuments,
                        viescolaire: vieScolaireDocuments,
                        entreprises: entrepriseDocuments,
                        factures: facturesDocuments,
                        // inscriptionsReinscriptions: insReinsDocuments
                    }

                    changeUserData("administrativeDocuments", responseDocuments);
                } else if (code === 520 || code === 525) {
                    console.log("INVALID TOKEN: LOGIN REQUIRED");
                    requireLogin();
                }
                setTokenState((old) => (response?.token || old));
            })
            .finally(() => {
                abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
            });
    }

    async function renameFolder(id, name, controller = (new AbortController())) {
        abortControllers.current.push(controller);
        return edpFetch(
            `https://api.ecoledirecte.com/v3/messagerie/classeur/${id}.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${JSON.stringify({ id, type: "classeur", icon: "fa-folder", order: 1, libelle: name, expired: Date.now() + 3600000 })}`,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                const oldMessageFolders = useUserData("messageFolders").get();
                // the updated folder should be edited in order no modify the libelle of the correct folder
                const updatedFolders = oldMessageFolders.map(folder => {
                    if (folder.id === id) {
                        return { ...folder, name };
                    }
                    return folder;
                });
                useUserData("messageFolders").set(updatedFolders);
            }
            // TODO: handle errors
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function deleteFolder(id, controller = new AbortController()) {
        abortControllers.current.push(controller);
        return edpFetch(
            `https://api.ecoledirecte.com/v3/messagerie/classeur/${id}.awp?verbe=delete&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: "data={}",
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                const oldMessageFolders = useUserData("messageFolders").get();
                // delete the folder from the list of folders
                const updatedFolders = oldMessageFolders.filter(folder => folder.id !== id);
                useUserData("messageFolders").set(updatedFolders);
                return true;
            }
            // TODO: handle errors (ex: "Dossier non vide")
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function createFolder(name, controller = new AbortController()) {
        abortControllers.current.push(controller);
        return edpFetch(
            `https://api.ecoledirecte.com/v3/messagerie/classeurs.awp?verbe=post&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${JSON.stringify({ libelle: name })}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                const oldMessageFolders = useUserData("messageFolders").get();
                const newFolder = {
                    id: response.data.id,
                    name: response.data.libelle,
                    fetchInitiated: false,
                    fetched: false
                };
                const updatedFolders = [...oldMessageFolders, newFolder];
                useUserData("messageFolders").set(updatedFolders);
                return response.data.id;
            }
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function archiveMessage(id, controller = new AbortController()) {
        abortControllers.current.push(controller);
        return edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[activeAccount].accountType === "E" ? "eleves/" + accountsListState[activeAccount].id : "familles/" + accountsListState[activeAccount].familyId}/messages.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${encodeURIComponent(JSON.stringify({ action: "archiver", ids: [id], anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-") }))}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                //move the message to the -3 folder
                const oldSortedMessages = useUserData("sortedMessages").get();
                const updatedMessages = oldSortedMessages.map(message => {
                    if (message.id === id) {
                        return { ...message, folderId: -2 };
                    }
                    return message;
                });
                updatedMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
                changeUserData("sortedMessages", updatedMessages);
                console.log(updatedMessages);
                console.log("Message archivé avec succès");
                return true;
            }
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function unarchiveMessage(id, controller = new AbortController()) {
        abortControllers.current.push(controller);
        return edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[activeAccount].accountType === "E" ? "eleves/" + accountsListState[activeAccount].id : "familles/" + accountsListState[activeAccount].familyId}/messages.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${encodeURIComponent(JSON.stringify({ action: "desarchiver", ids: [id], anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-") }))}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                // move the message to the 0 folder
                const oldSortedMessages = useUserData("sortedMessages").get();
                const updatedMessages = oldSortedMessages.map(message => {
                    if (message.id === id) {
                        return { ...message, folderId: 0 };
                    }
                    return message;
                });
                // re-sort the messages by date
                updatedMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
                changeUserData("sortedMessages", updatedMessages);
                console.log(updatedMessages);
                console.log("Message désarchivé avec succès");
                return true;
            }
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function moveMessage(ids, folderId, controller = new AbortController()) {
        abortControllers.current.push(controller);
        const userId = activeAccount;
        return edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[userId].accountType === "E" ? "eleves/" + accountsListState[userId].id : "familles/" + accountsListState[userId].familyId}/messages.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${JSON.stringify({ action: "deplacer", idClasseur: folderId, ids: ids.map((id) => `${id}:-1`) })}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                // move the message to the specified folder
                const oldSortedMessages = useUserData("sortedMessages").get();
                const updatedMessages = oldSortedMessages.map(message => {
                    if (ids.includes(message.id)) {
                        return { ...message, folderId };
                    }
                    return message;
                });
                updatedMessages.sort((a, b) => new Date(b.date) - new Date(a.date));
                changeUserData("sortedMessages", updatedMessages);
                console.log(updatedMessages);
                console.log("Message déplacé avec succès");
                return true;
            }
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }

    async function deleteMessage(id, controller = new AbortController()) {
        abortControllers.current.push(controller);
        // the data is:
        // data = {
        //     "action": "supprimer",
        //     "ids": [
        //         16199
        //     ],
        //     "anneeMessages": "2024-2025",
        //     "idDossier": -5
        // }
        const userId = activeAccount;
        return edpFetch(
            `https://api.ecoledirecte.com/v3/${accountsListState[userId].accountType === "E" ? "eleves/" + accountsListState[userId].id : "familles/" + accountsListState[userId].familyId}/messages.awp?verbe=put&v=${apiVersion}`,
            {
                method: "POST",
                headers: {
                    "x-token": tokenState
                },
                body: `data=${JSON.stringify({ action: "supprimer", ids: [id], anneeMessages: getUserSettingValue("isSchoolYearEnabled") ? getUserSettingValue("schoolYear").join("-") : getCurrentSchoolYear().join("-"), idDossier: -5 })}`,
                signal: controller.signal,
                referrerPolicy: "no-referrer",
            },
            "json"
        ).then(response => {
            if (response.code === 200) {
                // delete the message from the list of messages
                const oldSortedMessages = useUserData("sortedMessages").get();
                const updatedMessages = oldSortedMessages.filter(message => message.id !== id);
                changeUserData("sortedMessages", updatedMessages);
                console.log(updatedMessages);
                console.log("Message supprimé avec succès");
                return true;
            }
        }).finally(() => {
            abortControllers.current.splice(abortControllers.current.indexOf(controller), 1);
        });
    }


    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //                                                                                                                                                                                 //
    //                                                                              End Of Fetch Functions                                                                             //
    //                                                                                                                                                                                 //
    /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


    /* ################################ CONNEXION/DÉCONNEXION ################################ */

    function setUserInfo(token, accountsList) {
        console.log("LOGGED IN ; TOKEN & ACCOUNTSLIST GOT");
        setTokenState(token);
        setAccountsListState(accountsList);
        setGrades(createUserLists(accountsList.length));
        setHomeworks(createUserLists(accountsList.length));
        setTimeline(createUserLists(accountsList.length));
        setSchoolLife(createUserLists(accountsList.length));
        setUserSettings(initSettings(accountsList));
        setUserData(initData(accountsList.length));
        // localStorage.setItem("token", token);
        // localStorage.setItem("accountsList", JSON.stringify(accountsList));
    }

    function resetUserData(hard = true) {
        if (hard) {
            setUserIds({});
            setActiveAccount(0);
            // localStorage.removeItem(lsIdName);
            localStorage.removeItem("encryptedUserIds");
        }
        setUserData([])
        setGrades([]);
        setHomeworks([]);
        setTimeline([]);
        setSchoolLife([]);
        // setKeepLoggedIn(false);
    }

    function logout() {
        // suppression des informations de connexion
        localStorage.removeItem("token");
        localStorage.removeItem("accountsList");
        localStorage.removeItem("oldActiveAccount");
        // suppression des paramètres locaux et globaux
        localStorage.removeItem("userSettings");
        localStorage.removeItem("keepLoggedIn");
        // réinitialisation des States
        setTokenState("");
        setAccountsListState([]);
        resetUserData();
        setKeepLoggedIn(false);
        setIsLoggedIn(false);
        // abort tous les fetch en cours pour éviter une reconnexion à partir du nouveau token renvoyé par l'API
        for (let controller of abortControllers.current) {
            controller.abort();
        }
        abortControllers.current = [];
    }


    /* ################################ THEME ################################ */

    useEffect(() => {
        const metaThemeColor = document.getElementById("theme-color");
        if (getUserSettingValue("displayTheme") === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            metaThemeColor.content = "#181829";
        } else if (getUserSettingValue("displayTheme") === "light") {
            document.documentElement.classList.add("light");
            document.documentElement.classList.remove("dark");
            metaThemeColor.content = "#e4e4ff";
        } else {
            document.documentElement.classList.add(window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light");
            document.documentElement.classList.remove(window.matchMedia('(prefers-color-scheme: dark)').matches ? "light" : "dark");
            metaThemeColor.content = (window.matchMedia('(prefers-color-scheme: dark)').matches ? "#181829" : "#e4e4ff");
        }
        toggleThemeTransitionAnimation();
    }, [getUserSettingValue("displayTheme")]);


    function getActualDisplayTheme() {
        const displayTheme = getUserSettingValue("displayTheme");
        if (displayTheme === "auto") {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";
        }
        return displayTheme;
    }



    function toggleThemeTransitionAnimation() {
        if (getUserSettingValue("displayMode") === "balanced" || getUserSettingValue("displayMode") === "performance") {
            return 0;
        }
        //  vérifie l'existence d'un timeout actif
        if (oldTimeoutId) {
            // un timeout était déjà en cours, on le supprime
            clearTimeout(oldTimeoutId);
        }
        document.documentElement.classList.add("switching-theme");
        const timeoutId = setTimeout(() => { document.documentElement.classList.remove("switching-theme") }, 500);
        setOldTimeoutId(timeoutId);
    }

    /* ################################ MODE D'AFFICHAGE ################################ */

    useEffect(() => {
        document.documentElement.classList.remove("quality");
        document.documentElement.classList.remove("balanced");
        document.documentElement.classList.remove("performance");

        document.documentElement.classList.add(getUserSettingValue("displayMode"));
    }, [getUserSettingValue("displayMode")]);

    /* ################################################################################### */

    function refreshApp() {
        // permet de refresh l'app sans F5
        setAppKey(crypto.randomUUID());
    }

    // routing system
    const router = createBrowserRouter([
        {
            path: "/",
            element:
                <Root
                    currentEDPVersion={currentEDPVersion}
                    token={tokenState}
                    accountsList={accountsListState}
                    fakeLogin={fakeLogin}
                    resetUserData={resetUserData}

                    setDisplayTheme={(value) => { changeUserSettings("displayTheme", value) }}
                    displayTheme={getUserSettingValue("displayTheme")}

                    setDisplayModeState={(value) => { changeUserSettings("displayMode", value) }}
                    displayMode={getUserSettingValue("displayMode")}

                    activeAccount={activeAccount}
                    setActiveAccount={setActiveAccount}
                    logout={logout}
                    isStandaloneApp={isStandaloneApp}
                    isTabletLayout={isTabletLayout}

                    fetchHomeworks={fetchHomeworks}

                    setIsFullScreen={setIsFullScreen}
                    globalSettings={globalSettings}
                    useUserSettings={useUserSettings}
                    entryURL={entryURL}
                    setting={userSettings}
                    syncSettings={syncSettings}
                    createFolderStorage={createFolderStorage}

                    handleEdBan={handleEdBan}
                    isEDPUnblockInstalled={isEDPUnblockInstalled}
                    setIsEDPUnblockInstalled={setIsEDPUnblockInstalled}
                    isEDPUnblockActuallyInstalled={isEDPUnblockActuallyInstalled}
                    setIsEDPUnblockActuallyInstalled={setIsEDPUnblockActuallyInstalled}
                    requireA2F={requireA2F}
                    setRequireA2F={setRequireA2F}
                    fetchA2F={fetchA2F}

                    proxyError={proxyError}
                />
            ,

            errorElement: <ErrorPage sardineInsolente={sardineInsolente} />,
            children: [
                {
                    element: <LandingPage token={tokenState} accountsList={accountsListState} />,
                    path: "/",
                },
                {
                    element: <Feedback activeUser={(accountsListState.length > 0 && accountsListState[activeAccount])} carpeConviviale={carpeConviviale} isTabletLayout={isTabletLayout} />,
                    path: "feedback",
                },
                {
                    element: <EdpUnblock isEDPUnblockActuallyInstalled={isEDPUnblockActuallyInstalled} />,
                    path: "edp-unblock",
                },
                {
                    element: <Canardman />,
                    path: "quackquack",
                },
                {
                    element: <Lab fetchGrades={fetchUserGrades} />,
                    path: "lab",
                },
                {
                    element: <Museum />,
                    path: "museum",
                },
                {
                    element: <UnsubscribeEmails activeUser={(accountsListState.length > 0 && accountsListState[activeAccount])} thonFrustre={thonFrustre} />,
                    path: "unsubscribe-emails",
                },
                {
                    element: <Login keepLoggedIn={keepLoggedIn} setKeepLoggedIn={setKeepLoggedIn} A2FInfo={A2FInfo} setRequireA2F={setRequireA2F} bufferUserIds={bufferUserIds} fetchLogin={fetchLogin} logout={logout} loginFromOldAuthInfo={loginFromOldAuthInfo} isEDPUnblockInstalledActuallyInstalled={isEDPUnblockActuallyInstalled} currentEDPVersion={currentEDPVersion} />,
                    path: "login",
                },
                {
                    element: <Navigate to={`/app/${activeAccount}/dashboard`} />,
                    path: "app",
                },
                {
                    element: ((!tokenState || accountsListState.length < 1)
                        ? <Navigate to="/login" replace={true} />
                        : <>
                            <Header
                                currentEDPVersion={currentEDPVersion}
                                token={tokenState}
                                accountsList={accountsListState}
                                setActiveAccount={setActiveAccount}
                                activeAccount={activeAccount}
                                carpeConviviale={carpeConviviale}
                                isLoggedIn={isLoggedIn}
                                fetchUserTimeline={fetchUserTimeline}
                                timeline={timeline}
                                isTabletLayout={isTabletLayout}
                                isFullScreen={isFullScreen}
                                logout={logout}
                            />
                            {(!isLoggedIn && <LoginBottomSheet keepLoggedIn={keepLoggedIn} setKeepLoggedIn={setKeepLoggedIn} A2FInfo={A2FInfo} setRequireA2F={setRequireA2F} bufferUserIds={bufferUserIds} fetchLogin={fetchLogin} logout={logout} loginFromOldAuthInfo={loginFromOldAuthInfo} backgroundTask={keepLoggedIn && !!userIds.username && !!userIds.password && !requireA2F} onClose={() => setIsLoggedIn(true)} close={keepLoggedIn && !!userIds.username && !!userIds.password && !requireA2F} />)}
                        </>),
                    path: "app",
                    children: [
                        {
                            element: <Navigate to={`/app/${activeAccount}/account`} replace={true} />,
                            path: "account",
                        },
                        {
                            element: <Account schoolLife={schoolLife} fetchSchoolLife={fetchSchoolLife} fetchAdministrativeDocuments={fetchAdministrativeDocuments} sortSchoolLife={sortSchoolLife} isLoggedIn={isLoggedIn} activeAccount={activeAccount} />,
                            path: ":userId/account"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/settings`} replace={true} />,
                            path: "settings",
                        },
                        {
                            element: <Settings usersSettings={userSettings[activeAccount]} accountsList={accountsListState} getCurrentSchoolYear={getCurrentSchoolYear} resetUserData={resetUserData} />,
                            path: ":userId/settings"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/dashboard`} replace={true} />,
                            path: ":userId",
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/dashboard`} replace={true} />,
                            path: "dashboard",
                        },
                        {
                            element: <Dashboard fetchUserGrades={fetchUserGrades} grades={grades} fetchHomeworks={fetchHomeworks} activeAccount={activeAccount} isLoggedIn={isLoggedIn} useUserData={useUserData} sortGrades={sortGrades} isTabletLayout={isTabletLayout} />,
                            path: ":userId/dashboard"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/grades`} replace={true} />,
                            path: "grades"
                        },
                        {
                            element: <Grades fetchUserGrades={fetchUserGrades} grades={grades} activeAccount={activeAccount} isLoggedIn={isLoggedIn} useUserData={useUserData} sortGrades={sortGrades} isTabletLayout={isTabletLayout} />,
                            path: ":userId/grades"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/homeworks`} replace={true} />,
                            path: "homeworks"
                        },
                        {
                            element: <Homeworks isLoggedIn={isLoggedIn} activeAccount={activeAccount} fetchHomeworks={fetchHomeworks} homeworks={homeworks} setHomeworks={setHomeworks} />,
                            path: ":userId/homeworks"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/timetable`} replace={true} />,
                            path: "timetable"
                        },
                        {
                            element: <Timetable />,
                            path: ":userId/timetable"
                        },
                        {
                            element: <Navigate to={`/app/${activeAccount}/messaging`} replace={true} />,
                            path: "messaging"
                        },
                        {
                            element: <Messaging isLoggedIn={isLoggedIn} activeAccount={activeAccount} fetchMessages={fetchMessages} fetchMessageContent={fetchMessageContent} fetchMessageMarkAsUnread={fetchMessageMarkAsUnread} renameFolder={renameFolder} deleteFolder={deleteFolder} createFolder={createFolder} archiveMessage={archiveMessage} unarchiveMessage={unarchiveMessage} moveMessage={moveMessage} deleteMessage={deleteMessage} />,
                            path: ":userId/messaging"
                        },
                    ],
                },
            ],
        },
    ]);

    const appContextValue = useMemo(() => ({
        useUserData,
        useUserSettings,
        refreshApp,
        addNewGrade,
        deleteFakeGrade,
        fetchHomeworksDone,
        fetchHomeworks,
        fetchHomeworksSequentially,
        promptInstallPWA,
        activeAccount,
        accountsListState,
        isLoggedIn,
        isMobileLayout,
        isTabletLayout,
        isStandaloneApp,
        isDevChannel,
        globalSettings,
        actualDisplayTheme,
        currentEDPVersion,
        edpFetch,
        tokenState,
    }), [
        useUserData,
        useUserSettings,
        refreshApp,
        addNewGrade,
        deleteFakeGrade,
        fetchHomeworksDone,
        fetchHomeworks,
        fetchHomeworksSequentially,
        promptInstallPWA,
        activeAccount,
        accountsListState,
        isLoggedIn,
        isMobileLayout,
        isTabletLayout,
        isStandaloneApp,
        isDevChannel,
        globalSettings,
        actualDisplayTheme,
        currentEDPVersion,
        edpFetch,
        tokenState,
    ]);

    return (
        <AppContext.Provider value={appContextValue} key={appKey}>
            <Suspense fallback={<AppLoading currentEDPVersion={currentEDPVersion} />}>
                <RouterProvider router={router} />
            </Suspense>
        </AppContext.Provider>
    );
}
