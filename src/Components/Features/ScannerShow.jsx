import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const ScannerShow = () => {
    const navigate = useNavigate();
    const qrCodeScannerRef = useRef(null);

    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [scannerActive, setScannerActive] = useState(false);

    useEffect(() => {
        const scannerId = "reader";
        let html5QrcodeScanner;

        const startScanner = () => {
            html5QrcodeScanner = new Html5QrcodeScanner(
                scannerId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    rememberLastUsedCamera: true,
                    supportedScanFormats: [Html5QrcodeSupportedFormats.QR_CODE]
                },
                /* verbose= */ false
            );

            const onScanSuccess = (decodedText, decodedResult) => {
                console.log(`QR Code scanned: ${decodedText}`);
                setScanResult(decodedText);
                setScannerActive(false);
                html5QrcodeScanner.clear().then(() => {
                    if (decodedText) {
                        navigate(`/share/${decodedText}`);
                    }
                }).catch(err => {
                    console.error("Failed to clear html5QrcodeScanner on success:", err);
                    if (decodedText) {
                        navigate(`/share/${decodedText}`);
                    }
                });
            };

            const onScanFailure = (error) => {
                setScanError("No QR code detected or camera issue. Please ensure good lighting.");
                setScanResult(null);
            };

            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            setScannerActive(true);
            qrCodeScannerRef.current = html5QrcodeScanner;
        };

        startScanner();

        return () => {
            if (qrCodeScannerRef.current && scannerActive) {
                qrCodeScannerRef.current.clear().catch(error => {
                    console.error("Failed to clear html5QrcodeScanner during unmount:", error);
                });
            }
        };
    }, [navigate, scannerActive]);

    const handleClose = () => {
        if (qrCodeScannerRef.current) {
            qrCodeScannerRef.current.clear().then(() => {
                navigate('/home'); // Redirect to /home after clearing scanner
            }).catch(err => {
                console.error("Error clearing scanner on close:", err);
                navigate('/home'); // Still navigate even if clear fails
            });
        } else {
            navigate('/home'); // Navigate directly if scanner ref is not available
        }
    };

    return (
        // Outer div for dark page background and centering
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            {/* Dark-themed card container */}
            <div className="bg-gray-800 text-gray-100 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-sm md:max-w-md lg:max-w-lg flex flex-col items-center relative">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-1 right-0 p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                    aria-label="Close scanner"
                >
                    {/* You'll need to install @heroicons/react for this icon */}
                    {/* npm install @heroicons/react */}
                    <X />
                </button>

                <h1 className="text-3xl font-extrabold text-blue-400 mb-6 text-center">
                    QR Code Scanner
                </h1>

                {/* Instruction text */}
                {!scanResult && !scanError && scannerActive && (
                    <p className="text-gray-400 text-base mb-4 text-center">
                        Point your camera at a QR code.
                    </p>
                )}

                {/* Scanner container */}
                <div
                    id="reader"
                    className="w-full h-auto bg-gray-700 border border-gray-600 rounded-lg overflow-hidden"
                    style={{ aspectRatio: '1/1', maxWidth: '300px' }}
                >
                    {/* The Html5QrcodeScanner will render its content here */}
                </div>

                {/* Scan Results and Error Messages */}
                {scanResult && (
                    <div className="mt-6 p-4 bg-green-900 border border-green-700 text-green-300 rounded-lg text-center w-full">
                        <p className="text-xl font-semibold">Scan Successful!</p>
                        <p className="mt-2 text-lg">
                            Room ID: <strong className="break-all text-green-100">{scanResult}</strong>
                        </p>
                    </div>
                )}

                {scanError && (
                    <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg text-center w-full">
                        <p className="text-xl font-semibold">Scan Failed</p>
                        <p className="mt-2 text-lg">
                            {scanError}
                        </p>
                        <button
                            onClick={() => {
                                setScanError(null);
                                setScanResult(null);
                                // A simple reload to re-initialize the scanner for a retry
                                window.location.reload();
                            }}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {!scannerActive && !scanResult && !scanError && (
                    <p className="mt-6 text-gray-400 text-center">Initializing camera...</p>
                )}
            </div>
        </div>
    );
}

export default ScannerShow;