import { LogOut, Upload, File, Image, FileText, FileArchive, FileCode, FileAudio, FileVideo, Download, X, Handshake } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ShareDataPage = () => {
    const { roomId } = useParams();
    console.log(roomId);
    const location = useLocation();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [currentUser] = useState(() => {
        const user = location.state?.user || {};
        return {
            name: user.name || 'You',
            photo: user.photo || '',
            uid: user.uid || `temp_${Math.random().toString(36).substr(2, 9)}`
        };
    });
    const [joinUser] = useState(() => {
        const from = location.state?.from || {};
        return {
            name: from.name || 'she',
            photo: from.photo || '',
            uid: from.uid || `temp_${Math.random().toString(36).substr(2, 9)}`
        };
    });
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    // Initialize Socket.IO connection
    useEffect(() => {
        if (!roomId) {
            toast.error('Invalid room ID');
            navigate('/');
            return;
        }

        const newSocket = io('http://localhost:5000', {
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            setConnectionStatus('connected');
            console.log('Socket connected:', newSocket.id);
            // Join room with validated data
            newSocket.emit('join_room', {
                roomId,
                user: currentUser,
                from: joinUser
            });
        });
        newSocket.on('disconnect', () => {
            setConnectionStatus('disconnected');
            toast.warning('Disconnected from server');
        });
        newSocket.on('connect_error', (err) => {
            setConnectionStatus('error');
            toast.error(`Connection error: ${err.message}`);
        });

        // Event handlers
        newSocket.on('connected_user', (user) => {
            setJoinUser(user);
            toast.info(`${user.name} joined the room`);
        });
        newSocket.on('new_file', (file) => {
            // Handle Base64 file data
            if (file.data && file.data.startsWith('data:')) {
                setFiles(prev => [{
                    id: `${file.name}-${Date.now()}`,
                    name: file.name,
                    type: file.type || file.name.split('.').pop().toLowerCase(),
                    size: formatFileSize(file.size),
                    data: file.data, // Base64 data
                    receivedAt: new Date().toISOString()
                }, ...prev]);
                toast.success(`Received: ${file.name}`);
            }
        });
        newSocket.on('user_left', (user) => {
            setJoinUser(null);
            toast.warning(`${user.name} left the room`);
        });
        newSocket.on('error', (error) => {
            toast.error(`Error: ${error.message}`);
            if (error.message.includes('room')) {
                navigate('/');
            }
        });
        setSocket(newSocket);
        return () => {
            newSocket.off(); // Remove all listeners
            newSocket.disconnect();
        };
    }, [roomId, currentUser, navigate]);

    // File handling functions
    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (!selectedFiles.length) return;

        if (!socket || connectionStatus !== 'connected') {
            toast.error('Not connected to server');
            return;
        }
        for (const file of selectedFiles) {
            try {
                const fileData = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified
                };
                // Read file as Base64
                const base64Data = await readFileAsBase64(file);
                fileData.data = base64Data;
                // Emit file with metadata
                socket.emit('upload_file', fileData);
                // Add to local state
                setFiles(prev => [{
                    id: `${file.name}-${Date.now()}`,
                    name: file.name,
                    type: file.type || file.name.split('.').pop().toLowerCase(),
                    size: formatFileSize(file.size),
                    data: base64Data,
                    uploadedAt: new Date().toISOString()
                }, ...prev]);
                // toast.success(`Uploaded: ${file.name}`);
            } catch (error) {
                toast.error(`Failed to upload ${file.name}: ${error.message}`);
            }
        }
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleDownloadFile = (file) => {
        if (!file.data) {
            toast.error('File data not available');
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = file.data;
            link.download = file.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // toast.success(`Downloaded ${file.name}`);
        } catch (error) {
            toast.error(`Download failed: ${error.message}`);
        }
    };

    const handleRemoveFile = (id) => {
        setFiles(files.filter(file => file.id !== id));
        // toast.info('File removed from view');
    };

    // Helper functions
    const getFileIcon = (fileName) => {
        const extension = fileName.split('.').pop().toLowerCase();
        const iconProps = { size: 18 };

        switch (true) {
            case ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension):
                return <Image {...iconProps} className="text-blue-400" />;
            case ['pdf', 'doc', 'docx'].includes(extension):
                return <FileText {...iconProps} className="text-red-400" />;
            case ['zip', 'rar', '7z'].includes(extension):
                return <FileArchive {...iconProps} className="text-yellow-400" />;
            case ['js', 'ts', 'html', 'css'].includes(extension):
                return <FileCode {...iconProps} className="text-purple-400" />;
            case ['mp3', 'wav'].includes(extension):
                return <FileAudio {...iconProps} className="text-green-400" />;
            case ['mp4', 'mov'].includes(extension):
                return <FileVideo {...iconProps} className="text-pink-400" />;
            default:
                return <File {...iconProps} className="text-gray-400" />;
        }
    };
    const formatFileSize = (bytes) => {
        if (typeof bytes !== 'number') return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    // Connection status indicator
    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected': return 'bg-green-500';
            case 'connecting': return 'bg-yellow-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };
    return (
        <>
            <ToastContainer position="top-right" autoClose={3000} />
            <motion.div className="w-full min-h-screen bg-slate-900 flex justify-center items-center p-4">
                <motion.div className="w-full max-w-md h-[95vh] flex flex-col rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-xl">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-700 bg-slate-800/80">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold text-white">File Share</h1>
                                <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
                            </div>
                            <Link to="/">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1.5 px-2 py-1.5 bg-red-600 hover:bg-red-700 rounded-md transition-colors text-sm"
                                >
                                    <LogOut size={16} />
                                </motion.button>
                            </Link>
                        </div>

                        {/* User Connection Status */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full border flex items-center justify-center text-white font-medium overflow-hidden bg-slate-700">
                                    {currentUser.photo ? (
                                        <img src={currentUser.photo} alt={currentUser.name} className="w-full h-full object-cover" />
                                    ) : (
                                        ""
                                    )}
                                </div>
                                <span className="text-teal-400 capitalize">{currentUser.name}</span>
                            </div>

                            <Handshake className="text-slate-500 mx-2" />

                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium overflow-hidden bg-slate-700">
                                    {joinUser ? (
                                        joinUser.photo ? (
                                            <img src={joinUser.photo} alt={joinUser.name} className="w-full h-full object-cover" />
                                        ) : (
                                            ''
                                        )
                                    ) : (
                                        <span className="text-slate-400">?</span>
                                    )}
                                </div>
                                <span className="text-cyan-500 capitalize">
                                    {joinUser ? joinUser.name : 'Waiting...'}
                                </span>
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
                                    className="h-full flex items-center justify-center"
                                >
                                    <p className="text-slate-400">No files shared yet</p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="space-y-2"
                                >
                                    {files.map((file) => (
                                        <motion.div
                                            key={file.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: 50 }}
                                            transition={{ type: 'spring', stiffness: 200 }}
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
                                            </div>
                                            <div className="flex gap-2">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDownloadFile(file)}
                                                    className="opacity-100 sm:opacity-0 border rounded-full group-hover:opacity-100 text-slate-400 hover:text-white p-1"
                                                >
                                                    <Download size={16} />
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleRemoveFile(file.id)}
                                                    className="opacity-100 sm:opacity-0 border rounded-full group-hover:opacity-100 text-slate-400 hover:text-red-400 p-1"
                                                >
                                                    <X size={16} />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {/* Upload Button */}
                    <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                        <motion.label
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer"
                        >
                            <Upload size={18} />
                            <span>Upload Files</span>
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
            </motion.div>
        </>
    );
};

export default ShareDataPage;