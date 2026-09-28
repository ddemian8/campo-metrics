import { Navigate } from "react-router-dom";

// Legacy individual-player dashboard removed during the B2B pivot.
// Always send users into the club workspace; useClub() handles
// "no club yet" by redirecting to /club/signup.
const Dashboard = () => <Navigate to="/club/dashboard" replace />;

export default Dashboard;
