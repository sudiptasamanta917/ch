import React from "react";
import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import "react-lazy-load-image-component/src/effects/blur.css";
import "react-toastify/dist/ReactToastify.css";
import "./globalInit";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import { ToastContainer } from "react-toastify";

import "./App.css";
import "./index.css";
import bg from "./assets/bg3.jpg";

import Multiplayer from "./pages/multiplayer/Multiplayer";
import Tournaments from "./pages/Tournaments";
import Playwithfriend from "./pages/Playwithfriend";
import BlogList from "./pages/blogPage/blog";
import Blogdetails from "./pages/blogPage/blogdetails";
import PlayerList from "./pages/blogPage/player";
import Pieces from "./pages/blogPage/pieces";
import Puzzle from "./pages/puzzle/Puzzle";
import ProtectRoute from "./components/auth/ProtectRoute";
import Trainer from "./pages/Trainer";
import Profile from "./pages/Profile";
import Games from "./pages/Games";
import LeaveRoomWarning from "./components/LeaveRoomWarning";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsCondition from "./pages/TermsCondition";
import RefundCancelation from "./pages/RefundCancelation";
import Userprofile from "./pages/Userprofile";
import AnalysisBoard from "./pages/AnalysisBoard/AnalysisBoard";
import LiveTournamentDetail from "./pages/LiveTournamentDetail";
import socket from "./pages/multiplayer/socket";

const Header = lazy(() => import("./components/Header"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const Passwordreset = lazy(() => import("./pages/auth/Passwordreset"));
const Chess8by8 = lazy(() => import("./pages/lichess/1by1/chess8by8"));
const LoginByEmail = lazy(() => import("./pages/auth/Loginbyemail"));
const Footer = lazy(() => import("./components/Footer"));
const ChessLearn = lazy(() => import("./pages/ChessLearn"));
const TournamentDetail = lazy(() => import("./pages/TournamentDetail"));
const Contact = lazy(() => import("./pages/Contact"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const RateUs = lazy(() => import("./pages/RateUs"));

import { getUserdata } from "./utils/getuserdata";
import { getApi } from "./utils/api";
import { useDispatch } from "react-redux";
import { GameStatus } from "./redux/action";


function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const dispatch = useDispatch();
    const location = useLocation();

    const UserDetail = JSON.parse(localStorage.getItem("User Detail"));
    const user = !!localStorage.getItem("chess-user-token");
    
    // const isMultiplayerPresent = location.pathname.includes("multiplayer");

    // useEffect(() => {
    //     if (!location.pathname.includes("multiplayer")) {
    //         dispatch(GameStatus(false));
    //     }
    // }, [location.pathname, dispatch]);

   useEffect(() => {
       async function fetchData() {
           try {
               const userdata = UserDetail?.name;
               if (userdata) {
                   const url = `${import.meta.env.VITE_URL}${
                       import.meta.env.VITE_GET_ACTIVITY
                   }/${userdata}`;
                   await getApi(url);
               }
           } catch (error) {
               console.error("Error fetching data:", error);
           }
       }
       fetchData();
   }, [UserDetail]);

    const queryClient = new QueryClient();

    return (
        <>
            <div className={`pt-32 min-h-screen bg-[#302e2b] pl-44 2xl:pl-0`}>
                <div className={`max-w-[1200px] m-auto`}>
                    {/* <div id="google_translate_element"></div> */}
                    {<LeaveRoomWarning />}
                    <QueryClientProvider client={queryClient}>
                        <div
                            className=""
                            style={{
                                background: `url(${bg}) cover/center no-repeat fixed`,
                            }}
                        >
                            <Suspense fallback={<div>Loading...</div>}>
                                <Header
                                    isSidebarOpen={isSidebarOpen}
                                    setIsSidebarOpen={setIsSidebarOpen}
                                />
                            </Suspense>
                            <div className={`pt-0 transition-all duration-300`}>
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Routes>
                                        <Route
                                            element={
                                                <ProtectRoute user={user} />
                                            }
                                        >
                                            <Route
                                                path="/multiplayer/:roomId/:time"
                                                element={<Multiplayer />}
                                            />
                                            <Route
                                                path="/trainer"
                                                element={<Trainer />}
                                            />
                                            <Route
                                                path="/profile"
                                                element={<Profile />}
                                            />
                                            <Route
                                                path="/userprofile/:userId"
                                                element={<Userprofile />}
                                            />
                                        </Route>
                                        <Route path="/" element={<Home />} />
                                        <Route
                                            path="/chess10by10"
                                            element={<Chess8by8 />}
                                        />
                                        <Route
                                            path="/tournaments"
                                            element={<Tournaments />}
                                        />
                                        <Route
                                            path="/chessLearn"
                                            element={<ChessLearn />}
                                        />
                                        <Route
                                            path="/TournamentDetail"
                                            element={<TournamentDetail />}
                                        />
                                        <Route
                                            path="/LiveTournamentDetail/:id"
                                            element={<LiveTournamentDetail />}
                                        />
                                        <Route
                                            path="/playwithfriend/:time"
                                            element={<Playwithfriend />}
                                        />
                                        <Route
                                            path="/blog"
                                            element={<BlogList />}
                                        />
                                        <Route
                                            path="/puzzle"
                                            element={<Puzzle />}
                                        />
                                        <Route
                                            path="/blog"
                                            element={<BlogList />}
                                        />
                                        <Route
                                            path="/player"
                                            element={<PlayerList />}
                                        />
                                        <Route
                                            path="/blogdetails"
                                            element={<Blogdetails />}
                                        />
                                        <Route
                                            path="/pieces"
                                            element={<Pieces />}
                                        />
                                        <Route
                                            path="/contact"
                                            element={<Contact />}
                                        />
                                        <Route
                                            path="/aboutUs"
                                            element={<AboutUs />}
                                        />
                                        <Route
                                            path="/Games"
                                            element={<Games />}
                                        />
                                        <Route
                                            path="/rate"
                                            element={<RateUs />}
                                        />
                                        <Route
                                            path="/analysisBoard/:roomId"
                                            element={<AnalysisBoard />}
                                        />
                                    </Routes>
                                </Suspense>
                                <Suspense fallback={<div>Loading...</div>}>
                                    <Routes>
                                        <Route
                                            path="/privacy"
                                            element={<PrivacyPolicy />}
                                        />
                                        <Route
                                            path="/termsCondition"
                                            element={<TermsCondition />}
                                        />
                                        <Route
                                            path="/refundCancelationPolicy"
                                            element={<RefundCancelation />}
                                        />
                                        <Route
                                            path="/register"
                                            element={
                                                <ProtectRoute
                                                    user={!user}
                                                    redirect="/"
                                                >
                                                    <Register />
                                                </ProtectRoute>
                                            }
                                        />
                                        <Route
                                            path="/login"
                                            element={
                                                <ProtectRoute
                                                    user={!user}
                                                    redirect="/"
                                                >
                                                    <Login />
                                                </ProtectRoute>
                                            }
                                        />
                                    </Routes>
                                </Suspense>
                            </div>
                        </div>

                        <ReactQueryDevtools initialIsOpen={false} />
                    </QueryClientProvider>
                    {/* <ToastContainer /> */}
                </div>
                <div className={`relative transition-all duration-300 2xl:ml-44`}>
                    <div className="absolute w-full rounded-t-md overflow-hidden">
                        <Suspense fallback={<div>Loading...</div>}>
                            <Footer />
                        </Suspense>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
