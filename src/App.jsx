import { Wifi, Zap, UploadCloud, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

function App() {
  return (
    <div className={`w-full relative flex justify-center items-center p-4 h-screen transition-colors duration-300 ${true ? 'bg-slate-900' : 'bg-gray-800'}`}>
      <div className={`w-full sm:w-[420px] sm:h-[95%] h-full rounded-xl p-8 flex flex-col justify-between shadow-2xl border transition-colors duration-300
                ${true ? 'bg-slate-800 border-slate-700 text-slate-50' : 'bg-teal-800 shadow border-slate-300 text-slate-900'}`}>
        {/* Title Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-extrabold leading-tight tracking-wide text-white">
            🚀 <span className="text-yellow-400">10x Faster</span> File Sharing
          </h1>
          <p className="text-gray-300 text-base font-light max-w-[320px] mx-auto leading-relaxed">
            Superfast peer-to-peer sharing with real-time connection & blazing speed. No uploads. No delays. 100% secure transfer.
          </p>
        </div>
        {/* Features List */}
        <ul className="w-full mt-6 space-y-3">
          {[
            { icon: <Zap className="text-yellow-400" size={22} />, text: "10x Faster P2P Transfer" },
            { icon: <Wifi className="text-blue-400" size={22} />, text: "Offline Mode (Wi-Fi / Hotspot)" },
            { icon: <UploadCloud className="text-green-400" size={22} />, text: "Drag & Drop File Sharing" },
            { icon: <Send className="text-red-400" size={22} />, text: "Real-time Connect & Send" },
          ].map(({ icon, text }, i) => (
            <li
              key={i}
              className="flex items-center gap-4 text-lg font-semibold text-white select-none"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10">
                {icon}
              </span>
              {text}
            </li>
          ))}
        </ul>
        {/* Connect Button */}
        <div className="w-full flex justify-center">
          <Link
            to="/home"
            className="mt-8 w-3/4 py-4 rounded-full bg-yellow-400 text-black text-center text-xl font-semibold hover:scale-105 hover:shadow-lg transition-transform duration-300 select-none"
          >
            Connect Now
          </Link>
        </div>
        {/* Hint */}
        <p className="mt-3 text-center text-gray-400 text-sm italic select-none">
          Click "Connect Now" to discover nearby devices and start sharing instantly.
        </p>
      </div>
    </div>
  );
}

export default App;
