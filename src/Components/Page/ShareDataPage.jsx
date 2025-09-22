import { LogOut, Upload, File, Image, FileText, FileArchive, FileCode, FileAudio, FileVideo, Download, X, Handshake } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ShareDataPage = () => {
    const { roomId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    // Constants
    const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024 // 5GB

    // State
    const [socket, setSocket] = useState(null); // Initialize with null
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [files, setFiles] = useState([]);
    const currentUserRef = useRef(null);
    const joinUserRef = useRef(null);
    const [currentUser] = useState(() => {
        const user = {
            name: state?.user?.name || 'You',
            photo: state?.user?.photo || 'https://placehold.co/40x40/cccccc/333333?text=👤',
            uid: state?.user?.uid || `temp_${Math.random().toString(36).slice(2, 11)}`
        };
        currentUserRef.current = user;
        return user;
    });
    const [joinUser, setJoinUser] = useState(() => {
        const user = {
            name: state?.from?.name || 'Waiting...',
            photo: state?.from?.photo || 'https://placehold.co/40x40/cccccc/333333?text=👤',
            uid: state?.from?.uid || `temp_${Math.random().toString(36).slice(2, 11)}`
        };
        joinUserRef.current = user;
        return user;
    });
    useEffect(() => {
        joinUserRef.current = joinUser;
    }, [joinUser]);

    // Helper functions
    const isValidFileType = (file) => {
        const validTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
            'text/javascript', 'text/typescript', 'text/html', 'text/css',
            'audio/mpeg', 'audio/wav', 'video/mp4', 'video/quicktime'
        ];
        return validTypes.includes(file.type) || !file.type;
    };
    const formatFileSize = (bytes) => {
        if (typeof bytes !== 'number' || isNaN(bytes)) return '0 Bytes';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = useCallback((fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconProps = { size: 18 };
        const iconMap = {
            jpg: <Image {...iconProps} className="text-blue-400" />,
            jpeg: <Image {...iconProps} className="text-blue-400" />,
            png: <Image {...iconProps} className="text-blue-400" />,
            gif: <Image {...iconProps} className="text-blue-400" />,
            webp: <Image {...iconProps} className="text-blue-400" />,
            pdf: <FileText {...iconProps} className="text-red-400" />,
            doc: <FileText {...iconProps} className="text-red-400" />,
            docx: <FileText {...iconProps} className="text-red-400" />,
            zip: <FileArchive {...iconProps} className="text-yellow-400" />,
            rar: <FileArchive {...iconProps} className="text-yellow-400" />,
            '7z': <FileArchive {...iconProps} className="text-yellow-400" />,
            js: <FileCode {...iconProps} className="text-purple-400" />,
            ts: <FileCode {...iconProps} className="text-purple-400" />,
            html: <FileCode {...iconProps} className="text-purple-400" />,
            css: <FileCode {...iconProps} className="text-purple-400" />,
            mp3: <FileAudio {...iconProps} className="text-green-400" />,
            wav: <FileAudio {...iconProps} className="text-green-400" />,
            mp4: <FileVideo {...iconProps} className="text-pink-400" />,
            mkv: <FileVideo {...iconProps} className="text-pink-400" />,
            mov: <FileVideo {...iconProps} className="text-pink-400" />
        };
        return iconMap[extension] || <File {...iconProps} className="text-gray-400" />;
    }, []);

    // File handlers
    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) {
            // No files selected, or dialog was cancelled, do nothing.
            return;
        }

        if (!socket || connectionStatus !== 'connected') {
            toast.error('Not connected to the server. Please wait or refresh.');
            // Clear the input even if not connected, so the same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        for (const file of selectedFiles) {
            if (file.size > MAX_FILE_SIZE) {
                toast.error(`File too large: ${file.name} (max ${formatFileSize(MAX_FILE_SIZE)})`);
                continue;
            }

            if (!isValidFileType(file)) {
                toast.error(`Unsupported type: ${file.name}`);
                continue;
            }

            const fileId = `${file.name}-${Date.now()}`;

            try {
                const fileData = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (error) => {
                        console.error(`[CLIENT - ERROR] FileReader error for ${file.name}:`, error);
                        reject(error);
                    };
                    reader.readAsDataURL(file);
                });

                setFiles(prev => [{
                    id: fileId,
                    name: file.name,
                    type: file.type || file.name.split('.').pop().toLowerCase(),
                    size: formatFileSize(file.size),
                    rawSize: file.size,
                    uploadedAt: new Date().toISOString(),
                    progress: 0,
                    isSending: true,
                    data: fileData
                }, ...prev]);

                console.log(`[CLIENT - SENDING] Data URL length: ${fileData.length}`);

                socket.emit('send_file', {
                    roomId, file: {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: fileData
                    }
                });

                setFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, progress: 100, isSending: false } : f
                ));
                toast.success(`Sent: ${file.name}`);
            } catch (error) {
                toast.error(`Error reading or sending: ${file.name}`);
                setFiles(prev => prev.filter(f => f.id !== fileId));
                console.error(`[CLIENT - ERROR] Error reading or sending file ${file.name}:`, error);
            }
        }
        // Clear the input after processing all selected files, regardless of errors
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const handleDownloadFile = useCallback((file) => {
        if (!file.data) {
            toast.error('No file data available for download.');
            return;
        }
        try {
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Downloaded: ${file.name}`);
        } catch (error) {
            toast.error(`Error downloading: ${file.name}`);
            console.error(`[CLIENT - ERROR] Error during download of ${file.name}:`, error);
        }
    }, []);
    const handleRemoveFile = useCallback((id) => {
        setFiles(prev => prev.filter(file => file.id !== id));
        toast.info('File removed from list.');
    }, []);
    const HandleExitRoom = () => {
        if (socket && connectionStatus === 'connected') {
            // Emit 'exitRoom' and expect an 'acknowledgement' from the server
            socket.emit('exit_room', { roomId, user: currentUserRef.current }, (response) => {
                if (response.success) {
                    toast.info('You have left the room.');
                    navigate('/home');
                } else {
                    toast.error(`Failed to leave room: ${response.message || 'Unknown error'}`);
                    console.error("[CLIENT - ERROR] Failed to leave room:", response.message);
                }
            });
        } else {
            toast.warn('Not connected to the server. Redirecting to home...');
            navigate('/home');
        }
    };


    // Socket handlers
    useEffect(() => {
        if (!roomId) {
            toast.error('Invalid room ID. Redirecting to home...');
            navigate('/');
            return;
        }
        const SERVER_URL = 'http://localhost:5000';
        const newSocket = io(SERVER_URL);
        setSocket(newSocket);
        newSocket.on('connect', () => {
            setConnectionStatus('connected');
            newSocket.emit('join_room', { roomId, user: currentUserRef.current, from: joinUserRef.current });
            toast.success('Connected to room!');
        });
        newSocket.on('disconnect', (reason) => {
            setConnectionStatus('disconnected');
            toast.warning(`Disconnected from server: ${reason}`);
            console.log(`[SOCKET] Disconnected from server. Reason: ${reason}`);
            // No navigation here, as it might be an intentional disconnect or network issue
            // The user will be redirected by HandleExitRoom if they initiate it
            setJoinUser({
                name: 'Waiting...',
                photo: 'https://placehold.co/40x40/cccccc/333333?text=👤',
                uid: `temp_${Math.random().toString(36).slice(2, 11)}`
            });
        });

        newSocket.on('connect_error', (err) => {
            setConnectionStatus('error');
            toast.error(`Connection error: ${err.message}. Please check server status.`);
            console.error(`[SOCKET - ERROR] Connection error:`, err);
            navigate('/home'); // Redirect to home on critical connection error
            setJoinUser({
                name: 'Waiting...',
                photo: 'https://placehold.co/40x40/cccccc/333333?text=👤',
                uid: `temp_${Math.random().toString(36).slice(2, 11)}`
            });
        });

        newSocket.on('connected_user', (userData) => {
            setJoinUser(prevJoinUser => {
                if (userData.uid !== currentUserRef.current.uid && userData.uid !== prevJoinUser.uid) {
                    toast.info(`${userData.name} joined the room!`);
                    console.log(`[SOCKET] User joined: ${userData.name} (UID: ${userData.uid})`);
                    return userData;
                }
                return prevJoinUser;
            });
        });

        newSocket.on('user_left', (userData) => {
            toast.info(`${userData.name} has left the room.`);
            console.log(`[SOCKET] User left: ${userData.name} (UID: ${userData.uid})`);
            setJoinUser({
                name: 'Waiting...',
                photo: 'https://placehold.co/40x40/cccccc/333333?text=👤',
                uid: `temp_${Math.random().toString(36).slice(2, 11)}`
            });
            setTimeout(() => {
                navigate("/home")
            }, 2000);
        });
        newSocket.on('new_file', (file) => {
            if (file.data && typeof file.data === 'string' && file.data.startsWith('data:')) {
                setFiles(prev => [{
                    id: `${file.name}-${Date.now()}-received`,
                    name: file.name,
                    type: file.type || file.name.split('.').pop().toLowerCase(),
                    size: formatFileSize(file.size),
                    data: file.data,
                    receivedAt: new Date().toISOString()
                }, ...prev]);
                toast.success(`Received: ${file.name}`);
            } else {
                toast.error(`Invalid file data received for: ${file.name || 'unknown file'}`);
            }
        });
        newSocket.on('error', (error) => {
            toast.error(`Server error: ${error.message}`);
            console.error(`[SOCKET - ERROR] Server sent an error:`, error);
            if (error.message.includes('room') || error.message.includes('permission')) {
                navigate('/home');
            }
        });
        return () => {
            console.log('[SOCKET] Cleaning up socket listeners and disconnecting.');
            newSocket.offAny();
            newSocket.disconnect();
        };
    }, [roomId, navigate]);

    // UI Components
    const StatusIndicator = () => (
        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
            }`} />
    );

    const UserAvatar = ({ user }) => (
        <div className="w-18 h-18 p-2 rounded-full border flex items-center justify-center overflow-hidden bg-slate-700">
            {user.photo && user.photo !== 'https://placehold.co/40x40/cccccc/333333?text=👤' ? (
                <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
            ) : (
                <div className="flex justify-center items-center h-full text-black">👤</div>
            )}
        </div>
    );

    const FileItem = ({ file }) => (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="group flex items-center gap-3 p-3 bg-slate-750 hover:bg-slate-700 rounded-lg border border-slate-700/50"
        >
            <div className="p-2 rounded-md bg-slate-700/50">
                {getFileIcon(file.name)}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm truncate">{file.name}</p>
                <p className="text-xs text-slate-400">
                    {file.size} • {new Date(file.uploadedAt || file.receivedAt).toLocaleTimeString()}
                </p>
                {file.isSending && file.progress !== undefined && (
                    <div className="w-full bg-slate-600 rounded-full h-1 mt-1">
                        <div
                            className="bg-blue-500 h-1 rounded-full"
                            style={{ width: `${file.progress}%` }}
                        ></div>
                    </div>
                )}
            </div>
            <div className="flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDownloadFile(file)}
                    className="sm:opacity-0 group-hover:opacity-100 border rounded-full text-slate-400 hover:text-white p-1"
                    title="Download File"
                >
                    <Download size={16} />
                </motion.button>
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleRemoveFile(file.id)}
                    className="sm:opacity-0 group-hover:opacity-100 border rounded-full text-slate-400 hover:text-red-400 p-1"
                    title="Remove from list"
                >
                    <X size={16} />
                </motion.button>
            </div>
        </motion.div>
    );

    return (
        <>
            <ToastContainer position="top-right" autoClose={1000} />
            <div className="w-full min-h-screen bg-slate-900 flex justify-center items-center p-4">
                <motion.div className="w-full max-w-md h-[95vh] flex flex-col rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-xl">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white">File Share</h1>
                                <StatusIndicator />
                            </div>
                            <motion.button
                                onClick={HandleExitRoom}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                                title="Leave Room"
                            >
                                <LogOut size={16} />
                            </motion.button>
                        </div>
                        {/* User Connection */}
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col items-center gap-3">
                                <UserAvatar user={currentUser} />
                                <span className="text-teal-400 capitalize">{currentUser.name}</span>
                            </div>

                            <Handshake size={40} className="relative top-4 text-slate-500 mx-2" />

                            <div className="flex flex-col items-center gap-3">
                                <UserAvatar user={joinUser} />
                                <span className="text-cyan-500 capitalize">{joinUser.name}</span>
                            </div>
                        </div>
                    </div>
                    {/* File List */}
                    <div className="flex-1 overflow-y-auto px-3 py-2">
                        <AnimatePresence>
                            {files.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-4"
                                >
                                    <File size={48} className="text-slate-500 mb-4" />
                                    <p className="text-slate-400 text-lg">No files shared yet.</p>
                                    <p className="text-slate-500 text-sm mt-2">Click "Upload File" to begin sharing!</p>
                                </motion.div>
                            ) : (
                                <motion.div className="space-y-2">
                                    {files.map(file => <FileItem key={file.id} file={file} />)}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Upload Button */}
                    <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                        <motion.label
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex hover:font-serif items-center justify-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer text-white font-semibold"
                        >
                            <Upload size={18} />
                            <span>Upload File</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                multiple
                                onChange={handleFileUpload}
                            />
                        </motion.label>
                    </div>
                </motion.div>
            </div>
        </>
    );
};

export default ShareDataPage;