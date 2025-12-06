import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PublicRouterContextType {
    currentPath: string;
    navigate: (path: string) => void;
    replace: (path: string) => void;
}

const PublicRouterContext = createContext<PublicRouterContextType | undefined>(undefined);

export const PublicRouterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentPath, setCurrentPath] = useState(window.location.pathname);

    useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(window.location.pathname);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const navigate = (path: string) => {
        window.history.pushState({}, '', path);
        setCurrentPath(path);
        window.scrollTo(0, 0); // Scroll to top on navigation
    };

    const replace = (path: string) => {
        window.history.replaceState({}, '', path);
        setCurrentPath(path);
        window.scrollTo(0, 0);
    };

    return (
        <PublicRouterContext.Provider value={{ currentPath, navigate, replace }}>
            {children}
        </PublicRouterContext.Provider>
    );
};

export const usePublicRouter = () => {
    const context = useContext(PublicRouterContext);
    if (context === undefined) {
        throw new Error('usePublicRouter must be used within a PublicRouterProvider');
    }
    return context;
};
