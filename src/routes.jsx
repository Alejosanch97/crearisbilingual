import { createBrowserRouter, createRoutesFromElements, Route, Navigate } from "react-router-dom";
import { Layout } from "./pages/Layout";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { PlanningCLIL } from "./pages/PlanningCLIL"; 
import { ActivitiesEvents } from "./pages/ActivitiesEvents";
import { ClassReview } from "./pages/ClassReview"; // 1. Importamos la nueva página de revisión

// Función para obtener el usuario actualizado
const getSavedUser = () => {
    const user = localStorage.getItem("userBilingual");
    return user ? JSON.parse(user) : null;
};

// Componente para proteger rutas y pasar el usuario actualizado
const ProtectedRoute = ({ children }) => {
    const user = getSavedUser();
    if (!user) return <Navigate to="/" replace />;
    return children(user);
};

export const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<Layout />} errorElement={<h1>Not found!</h1>} >
        
        {/* Public: Login / Landing */}
        <Route index element={<Home />} />
        
        {/* Protected: Dashboard */}
        <Route 
            path="/dashboard" 
            element={
                <ProtectedRoute>
                    {(user) => <Dashboard user={user} />}
                </ProtectedRoute>
            } 
        />
        
        {/* Protected: Planeación CLIL */}
        <Route 
            path="/planeacion" 
            element={
                <ProtectedRoute>
                    {(user) => <PlanningCLIL userData={user} />}
                </ProtectedRoute>
            } 
        />

        {/* Protected: Actividades y Eventos */}
        <Route 
            path="/actividades" 
            element={
                <ProtectedRoute>
                    {(user) => <ActivitiesEvents userData={user} />}
                </ProtectedRoute>
            } 
        />

        {/* Protected: Revisión de Clases (NUEVA) */}
        <Route 
            path="/revision" 
            element={
                <ProtectedRoute>
                    {(user) => <ClassReview userData={user} />}
                </ProtectedRoute>
            } 
        />

        {/* Error 404 */}
        <Route path="*" element={<h1>Página no encontrada</h1>} />
      </Route>
    )
);