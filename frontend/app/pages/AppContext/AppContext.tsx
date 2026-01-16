// AppContext.tsx

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import axios from 'axios';

interface AppContextData {
    success: boolean;
    message: string;
    appData: {
        appLogo: string;
        appIcon: string;
        appName: string;
        appTagline: string;
        appBotName: string;
        paymentMode: boolean;
        socialAuth: boolean;
        signUpMode: boolean;
        chatMessages: any;
        chatModel: string;
        token: string;
        maxUsers: string;
        maxQuery: string;
        maxStorage: string;
        defaultResponseSuffix: string;
        isDeleteAccount: boolean;
        maxFileUploads:any;
        paymentCurrencies: string,
        activeCurrencies: string,
        locationAccessKey: string,
        multilanguage:boolean
    };
}

const AppContext = createContext<AppContextData | undefined>(undefined);

interface AppContextProviderProps {
    children: ReactNode;
}

const convertImageToBase64 = async (imageUrl: string): Promise<string> => {
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64Image = btoa(
            new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        return `data:${response.headers['content-type']};base64,${base64Image}`;
    } catch (error) {
        console.error('Error fetching or converting image:', error);
        return "";
    }
};

const AppContextProvider: React.FC<AppContextProviderProps> = ({ children }) => {
    const [contextValues, setContextValues] = useState<AppContextData | undefined>(undefined);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_APP_BACKEND_URL}/app-data`);
                const data: AppContextData = response.data;
                const appLogoBase64 = await convertImageToBase64(`${import.meta.env.VITE_APP_BACKEND_URL}/${data.appData.appLogo}`);
                const appIconBase64 = await convertImageToBase64(`${import.meta.env.VITE_APP_BACKEND_URL}/${data.appData.appIcon}`);
                setContextValues({
                    ...data,
                    appData: {
                        ...data.appData,
                        appLogo: appLogoBase64,
                        appIcon: appIconBase64,
                    },
                });
            } catch (error) {
                setContextValues({
                    success: true,
                    message: "",
                    appData: {
                        appBotName: "Bot",
                        appIcon: "app-icon/favicon.png",
                        appLogo: "app-logo/logo.png",
                        appName: "AIChatbot",
                        appTagline: "Tagline",
                        paymentMode: false,
                        socialAuth: false,
                        signUpMode: false,
                        chatMessages: '',
                        chatModel: '',
                        token: '',
                        maxUsers: '',
                        maxQuery: '',
                        maxStorage: '',
                        defaultResponseSuffix: '',
                        isDeleteAccount: false,
                        maxFileUploads:100,
                        paymentCurrencies: '',
                        activeCurrencies: '',
                        locationAccessKey: '',
                        multilanguage: false
                    }
                });
                console.error('Error fetching app data:', error);
            }
        };

        fetchData();
    }, []);

    if (!contextValues) {
        return <div className='d-flex align-items-center justify-content-center' style={{ height: '100%' }}>Loading...</div>;
    }

    return <AppContext.Provider value={contextValues}>{children}</AppContext.Provider>;
};

const useAppContext = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }

    return context;
};

export { AppContext, AppContextProvider, useAppContext };
