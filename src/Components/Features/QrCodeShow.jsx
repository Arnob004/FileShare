import React from 'react';

const QrCodeShow = ({ data, setShowQr }) => {
    return (
        <div
            onClick={() => setShowQr(false)}
            className="fixed inset-0 bg-transparent bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-50"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white dark:bg-slate-800 border text-gray-800 dark:text-white rounded-2xl shadow-xl ms:w-[25%] py-10 p-4"
            >
                {/* Close Button */}
                <button

                    onClick={() => setShowQr(false)}
                    className="absolute hover:scale-115 hover:rotate-20 top-0 right-2.5 text-3xl font-bold text-gray-400 hover:text-red-500 transition-colors"
                    title="Close"
                >
                    &times;
                </button>
                {/* Title */}
                <h3 className="font-semibold text-center mb-6 text-2xl">Scan This QR Code</h3>
                {/* QR Image */}
                <div className="flex justify-center">
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${data.uid}&size=150x150`}
                        alt="User QR Code"
                        className="rounded-xl p-3 scale-110 bg-white border border-gray-300 dark:border-gray-600 shadow-md"
                    />
                </div>
            </div>
        </div>
    );
};

export default QrCodeShow;
