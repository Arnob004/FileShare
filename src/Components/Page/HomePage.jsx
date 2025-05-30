import {
    Check,
    Loader,
    LogOut,
    Moon,
    QrCode,
    Scan,
    Sun,
    X,
} from 'lucide-react';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QrCodeShow from '../Features/QrCodeShow';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Helper function to generate random ID
const generateId = (length = 5) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');
};

// Moved SearchBar outside the component
const SearchBar = React.memo(({ darkMode, searchText, setSearchText, setShowQr }) => (
    <div className={`mt-4 p-3 rounded-xl transition ${darkMode ? 'bg-slate-700' : 'bg-sky-100'}`}>
        <div className="flex justify-between items-center mb-2">
            <h2 className={`text-xl font-serif tracking-wide capitalize ${darkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                Quick search
            </h2>
            <div className="flex gap-2">
                <button className={`w-8 h-8 flex justify-center items-center border rounded-md transition ${darkMode ? 'border-slate-600 hover:bg-slate-600' : 'border-slate-400 hover:bg-slate-200'}`}>
                    <Scan size={24} />
                </button>
                <button
                    onClick={() => setShowQr(true)}
                    className={`w-8 h-8 flex justify-center items-center border rounded-md transition ${darkMode ? 'border-slate-600 hover:bg-slate-600' : 'border-slate-400 hover:bg-slate-200'}`}
                >
                    <QrCode size={24} />
                </button>
            </div>
        </div>
        <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by ID..."
            className={`w-full px-4 py-2 rounded-md border outline-none placeholder:italic transition ${darkMode
                ? 'bg-slate-600 text-white placeholder-slate-400 border-slate-600 focus:border-sky-500'
                : 'bg-white text-slate-900 placeholder-slate-500 border-slate-400 focus:border-sky-500'}`}
        />
    </div>
));

const HomePage = () => {
    // State management
    const [user, setUser] = useState({ name: '', photo: '', uid: '' });
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const [showQr, setShowQr] = useState(false);
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [searchText, setSearchText] = useState('');
    const [sentRequests, setSentRequests] = useState({});
    const [receivedRequests, setReceivedRequests] = useState({});

    const navigate = useNavigate();

    // Optimized filtered users calculation
    const filteredUsers = useMemo(() => {
        return searchText
            ? onlineUsers.filter(u => u.uid.toLowerCase().includes(searchText.toLowerCase()))
            : onlineUsers;
    }, [onlineUsers, searchText]);

    // Fetch random Pokémon user on mount
    useEffect(() => {
        const fetchRandomUser = async () => {
            try {
                const randomId = Math.floor(Math.random() * 1024) + 1;
                const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
                const data = await response.json();
                setUser({
                    name: data.name,
                    photo: data.sprites.front_default,
                    uid: generateId(5),
                });
            } catch (error) {
                console.error('Failed to fetch Pokémon:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRandomUser();
    }, []);

    // Initialize socket connection
    useEffect(() => {
        const newSocket = io('https://backend-fileshare.onrender.com');
        setSocket(newSocket);
        return () => newSocket.disconnect();
    }, []);

    // Optimized socket event handlers
    useEffect(() => {
        if (!socket || !user.uid) return;

        socket.emit('new_user', user);

        const handleUpdateOnlineUsers = (users) => {
            setOnlineUsers(prev => {
                const filtered = users.filter(u => u.uid !== user.uid);
                // Only update if there's an actual change
                if (JSON.stringify(filtered) !== JSON.stringify(prev)) {
                    return filtered;
                }
                return prev;
            });
        };

        const handleReceiveRequest = ({ from, roomId }) => {
            if (!from || !roomId) return toast.error("Missing sender ID or room ID");

            setReceivedRequests(prev => ({
                ...prev,
                [from]: { status: 'pending', roomId }
            }));

            toast.info(`Connection request from ID: ${from}`, {
                onClick: () => setSearchText(from)
            });
        };

        const handleRequestAccepted = ({ from, roomId, senderData, receiverData }) => {
            setSentRequests(prev => ({ ...prev, [from]: 'accepted' }));
            toast.success(`Request accepted by ${receiverData.name}`);
            navigate(`/share/${roomId}`, {
                state: { user: senderData, from: receiverData }
            });
        };

        const handleRequestDeclined = (from) => {
            setSentRequests(prev => ({ ...prev, [from]: 'declined' }));
            toast.warning(`Request declined by ${from}`);
        };

        // Socket event listeners
        socket.on('update_online_users', handleUpdateOnlineUsers);
        socket.on('receive_request', handleReceiveRequest);
        socket.on('request_accepted', handleRequestAccepted);
        socket.on('request_declined', handleRequestDeclined);

        return () => {
            socket.off('update_online_users', handleUpdateOnlineUsers);
            socket.off('receive_request', handleReceiveRequest);
            socket.off('request_accepted', handleRequestAccepted);
            socket.off('request_declined', handleRequestDeclined);
        };
    }, [socket, user, navigate]);

    // Connection request handlers
    const sendJoinRequest = useCallback((receiver) => {
        if (!socket || !user?.uid) return toast.error("Connection error");

        const roomId = user.uid + receiver.uid;
        socket.emit('send_request', {
            to: receiver.uid,
            from: user.uid,
            roomId
        });

        setSentRequests(prev => ({ ...prev, [receiver.uid]: 'pending' }));
        toast.info(`Request sent to ${receiver.name} (${receiver.uid})`);
    }, [socket, user]);

    const handleAcceptRequest = useCallback((senderUid, roomId) => {
        const senderUser = onlineUsers.find(u => u.uid === senderUid);
        if (!senderUser) return toast.error("Sender not found");

        socket.emit('accept_request', {
            to: senderUid,
            from: user.uid,
            roomId,
            senderData: senderUser,
            receiverData: user
        });

        setReceivedRequests(prev => {
            const newRequests = { ...prev };
            delete newRequests[senderUid];
            return newRequests;
        });

        navigate(`/share/${roomId}`, {
            state: { user: user, from: senderUser }
        });
    }, [socket, user, onlineUsers, navigate]);

    const handleDeclineRequest = useCallback((senderUid) => {
        socket.emit('decline_request', { to: senderUid, from: user.uid });
        setReceivedRequests(prev => {
            const newRequests = { ...prev };
            delete newRequests[senderUid];
            return newRequests;
        });
        toast.info(`Request from ${senderUid} declined`);
    }, [socket, user]);

    if (loading) {
        return (
            <div className="w-full h-screen flex justify-center items-center bg-gray-900">
                <p className="text-white text-xl capitalize animate-pulse">Loading...</p>
            </div>
        );
    }

    // Memoized Header component
    const Header = React.memo(() => (
        <div className={`w-full flex justify-between items-center px-3 py-2 h-16 rounded-xl shadow ${darkMode ? 'bg-slate-700' : 'bg-sky-100'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 border-2 rounded-full overflow-hidden ${darkMode ? 'border-slate-500 bg-white' : 'border-slate-400 bg-slate-200'}`}>
                    {user.photo ? (
                        <img src={user.photo} alt={user.name} className="w-full h-full scale-105 object-cover" />
                    ) : (
                        <div className="flex justify-center items-center h-full text-black">👤</div>
                    )}
                </div>
                <div className="leading-tight">
                    <h1 className="text-xl font-semibold capitalize">{user.name}</h1>
                    <p className="text-sm font-bold text-gray-400">ID: {user.uid}</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => setDarkMode(prev => !prev)}
                    className={`w-10 h-10 flex justify-center items-center border rounded-md transition ${darkMode ? 'border-slate-600 hover:bg-slate-600' : 'border-slate-400 hover:bg-slate-200'}`}
                >
                    {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <Link to="/">
                    <button
                        className={`w-10 h-10 flex justify-center items-center border rounded-md transition hover:text-white ${darkMode ? 'border-slate-600 hover:bg-red-600' : 'border-slate-400 hover:bg-red-500'}`}
                        title="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </Link>
            </div>
        </div>
    ));

    // Memoized UserCard component
    const UserCard = React.memo(({ usr }) => {
        const requestStatus = sentRequests[usr.uid];
        const isPendingRequest = receivedRequests[usr.uid]?.status === 'pending';

        return (
            <div className={`p-2 sm:p-3 rounded-lg flex flex-col items-center transition duration-300 ${darkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-sky-100 shadow-md hover:bg-gray-200'}`}>
                <img
                    src={usr.photo}
                    alt={usr.name}
                    className="w-14 h-14 rounded-full object-cover border"
                />
                <p className="text-sm font-semibold mt-1 capitalize">{usr.name}</p>
                <p className="text-xs text-gray-400">ID: {usr.uid}</p>

                {isPendingRequest ? (
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={() => handleAcceptRequest(usr.uid, receivedRequests[usr.uid].roomId)}
                            className="px-1 py-1 bg-green-500 text-white rounded-md text-sm"
                        >
                            <Check />
                        </button>
                        <button
                            onClick={() => handleDeclineRequest(usr.uid)}
                            className="px-1 py-1 bg-red-500 text-white rounded-md text-sm"
                        >
                            <X />
                        </button>
                    </div>
                ) : requestStatus === 'pending' ? (
                    <button className="px-5 mt-1.5 py-1.5 bg-yellow-500 text-white rounded-md text-sm">
                        <Loader />
                    </button>
                ) : requestStatus === 'accepted' ? (
                    <button className="px-4 py-1.5 bg-green-500 text-white rounded-md text-sm">
                        Connected
                    </button>
                ) : (
                    <button
                        onClick={() => sendJoinRequest(usr)}
                        className="border capitalize font-serif px-3 mt-1 py-1.5 rounded-md hover:bg-blue-500 hover:text-white transition"
                    >
                        Connect
                    </button>
                )}
            </div>
        );
    });

    return (
        <>
            <ToastContainer position="top-right" autoClose={1000} />
            <div className={`w-full relative flex justify-center p-2 items-center h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-gray-800'}`}>
                <div className={`w-full sm:w-[400px] sm:h-[95%] h-screen rounded-xl relative p-4 shadow-2xl border transition-colors duration-300 ${darkMode
                    ? 'bg-slate-800 border-slate-700 text-slate-50'
                    : 'bg-teal-800 border-slate-400 text-slate-900'}`}>
                    <Header />
                    <SearchBar
                        darkMode={darkMode}
                        searchText={searchText}
                        setSearchText={setSearchText}
                        setShowQr={setShowQr}
                    />

                    {showQr && <QrCodeShow data={user} setShowQr={setShowQr} />}

                    <div className={`mt-4 h-[calc(110vh-350px)] overflow-y-auto p-2 sm:p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-gray-50'}`}>
                        {filteredUsers.length === 0 ? (
                            <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>
                                {searchText ? 'No matching users found' : 'No users online'}
                            </p>
                        ) : (
                            <div className="grid sm:grid-cols-3 grid-cols-2 sm:gap-1.5 gap-4">
                                {filteredUsers.map(usr => (
                                    <UserCard key={usr.uid} usr={usr} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default HomePage;
