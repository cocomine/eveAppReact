import {createContext} from 'react';

interface RouteParamsContextType {
    settingForceRefreshAlert?: number;
}

export const RouteParamsContext = createContext<RouteParamsContextType>(null);
