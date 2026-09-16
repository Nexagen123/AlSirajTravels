import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@fontsource/roboto/300.css'; // Light
import '@fontsource/roboto/400.css'; // Regular
import '@fontsource/roboto/500.css'; // Medium
import '@fontsource/roboto/700.css'; // Bold
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'

const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes

function InactivityLogout({ children }) {
    useEffect(() => {
        let timer;

        const logout = () => {
            if (!localStorage.getItem("frontend_token")) return;
            localStorage.removeItem("frontend_token");
            localStorage.removeItem("frontend_user");
            window.location.href = "/auth/login";
        };

        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(logout, INACTIVITY_LIMIT);
        };

        const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
        activityEvents.forEach((event) => window.addEventListener(event, resetTimer));
        resetTimer();

        return () => {
            clearTimeout(timer);
            activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
        };
    }, []);

    return children;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <BrowserRouter>
            <InactivityLogout>
                <App />
            </InactivityLogout>
        </BrowserRouter>
    </StrictMode>,
)