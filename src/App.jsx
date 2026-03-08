import React, { useState, useMemo } from 'react';
import { Dog, Activity, Scale, Utensils, ArrowRight, ArrowLeft, Settings, Check, HeartPulse, Sparkles, Calculator, PawPrint, Leaf, Package, User, Phone, Download, MapPin, Home, CloudLightning, Eye, EyeOff } from 'lucide-react';

// --- Utilerías ---
const roundPrice = (value) => Math.ceil(value / 100) * 100;

const initialUserData = {
  ownerName: '', whatsapp: '', name: '', breed: '', weight: 10, age: 4, 
  activity: 'medium', allergies: '', currentFood: '', address: '', 
  building: '', tower: '', apartment: ''
};

// --- Componentes UI ---
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl shadow-xl p-6 ${className}`}>{children}</div>;

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const baseStyle = "px-6 py-3 rounded-full font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 shadow-sm";
  const variants = {
    primary: "bg-amber-600 hover:bg-amber-700 text-white disabled:bg-amber-300",
    secondary: "bg-stone-100 hover:bg-stone-200 text-stone-700",
    outline: "border-2 border-stone-200 hover:border-amber-500 text-stone-600 hover:text-amber-600",
    ghost: "text-stone-500 hover:bg-stone-100",
    success: "bg-green-600 hover:bg-green-700 text-white"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const PriceTag = ({ original, final, label, hideDiscount = false }) => (
  <div className="flex flex-col items-end">
    {!hideDiscount && original && original !== final && (
      <span className="text-stone-400 text-sm line-through font-medium">${original.toLocaleString('es-CO')}</span>
    )}
    <span className="text-3xl font-bold text-stone-800 tracking-tight">${final.toLocaleString('es-CO')}</span>
    {!hideDiscount && label && <span className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{label}</span>}
  </div>
);

// --- App Principal ---
export default function App() {
  const [config, setConfig] = useState({
    caloriesPerKg: 35,
    activityFactor: { low: 0.9, medium: 1.0, high: 1.1 },
    ageFactor: { puppy: 1.2, adult: 1.0, senior: 0.85 },
    costPerGramVital: 18,
    costPerGramSignature: 25,
    variableCosts: 1500,
    nonVariableCosts: 2000,
    marginProduction: 25,
    marginProfitVital: 20,
    marginProfitSignature: 28,
    delivery7Days: 8000,
    delivery14Days: 12000,
    discountSignature: 20,
  });

  const [leads, setLeads] = useState([]);
  const [userData, setUserData] = useState(initialUserData);
  const [step, setStep] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showCajita, setShowCajita] = useState(false);
  const [showQuoteMode, setShowQuoteMode] = useState(true);

  // --- MOTOR DE CÁLCULO ---
  const calculations = useMemo(() => {
    let E = userData.age < 1 ? config.ageFactor.puppy : userData.age > 7 ? config.ageFactor.senior : config.ageFactor.adult;
    const A = config.activityFactor[userData.activity];
    const G = config.caloriesPerKg * userData.weight * A * E;

    const calc = (costG, profitM) => {
      const cb = (G * costG) + config.variableCosts;
      const cbp = cb / (1 - config.marginProduction / 100);
      const cve = (cbp / (1 - profitM / 100)) + config.nonVariableCosts;
      return cve;
    };

    const vitalCVe = calc(config.costPerGramVital, config.marginProfitVital);
    const sigCVe = calc(config.costPerGramSignature, config.marginProfitSignature);

    return {
      grams: G,
      vital: { plan14: roundPrice((14 * vitalCVe) + config.delivery14Days) },
      signature: {
        plan14: { 
          reg: roundPrice((14 * sigCVe) + config.delivery14Days), 
          disc: roundPrice(((14 * sigCVe) + config.delivery14Days) * (1 - config.discountSignature / 100)) 
        }
      }
    };
  }, [config, userData]);

  // --- SINCRONIZACIÓN CON GOOGLE SHEETS ---
  const syncToMaster = async (lead) => {
    const API_URL = "https://script.google.com/macros/s/AKfycbw3XcdCTahPVO7--cuuesP8zmw36kbSwz_YauKDes-BKq06_h4IRg5e0ECW4hHMohMo/exec"; 
    try {
      const payload = {
        ownerName: lead.ownerName,
        whatsapp: lead.whatsapp,
        dogName: lead.name,
        breed: lead.breed,
        weight: lead.weight,
        age: lead.age,
        activityLevel: lead.activity,
        allergies: lead.allergies,
        vitalPrice: lead.quoteVital,
        signaturePriceFull: lead.quoteSignatureRegular,
        signaturePriceDiscount: lead.quoteSignatureDiscount,
        fullAddress: `${lead.address} ${lead.building} T:${lead.tower} A:${lead.apartment}`
      };
      await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      console.log("Sincronización exitosa");
    } catch (e) { console.error("Error de sincronización:", e); }
  };

  // Función para guardar específicamente la dirección desde la cajita
  const saveAddressToSheet = () => {
    if (!userData.ownerName || !userData.whatsapp) {
      alert("Por favor ingresa primero el nombre del dueño y WhatsApp en el inicio para poder registrar la dirección.");
      return;
    }
    const leadUpdate = {
      ...userData,
      quoteVital: calculations.vital.plan14,
      quoteSignatureRegular: calculations.signature.plan14.reg,
      quoteSignatureDiscount: calculations.signature.plan14.disc,
      date: new Date().toISOString()
    };
    syncToMaster(leadUpdate);
    setShowCajita(false);
    alert("¡Datos de residencia sincronizados con el Master OPS!");
  };

  const handleResetApp = () => {
    setUserData(initialUserData);
    setStep(0);
  };

  const saveLead = (silent = false) => {
    const newLead = {
      ...userData,
      quoteVital: calculations.vital.plan14,
      quoteSignatureRegular: calculations.signature.plan14.reg,
      quoteSignatureDiscount: calculations.signature.plan14.disc,
      date: new Date().toISOString()
    };
    setLeads(prev => [...prev, newLead]);
    syncToMaster(newLead);
  };

  // --- RENDERIZADO DE PASOS ---
  const renderStep = () => {
    switch(step) {
      case 0: return (
        <div className="text-center space-y-6 animate-fadeIn">
          <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600 shadow-sm"><User size={48} /></div>
          <h2 className="text-3xl font-bold">¡Hola! Soy tu experto Wufy</h2>
          <div className="max-w-sm mx-auto text-left space-y-4">
            <input type="text" value={userData.ownerName} onChange={(e) => setUserData({...userData, ownerName: e.target.value})} placeholder="Tu Nombre" className="w-full p-3 border-2 rounded-xl outline-none focus:border-amber-500" />
            <input type="tel" value={userData.whatsapp} onChange={(e) => setUserData({...userData, whatsapp: e.target.value})} placeholder="WhatsApp" className="w-full p-3 border-2 rounded-xl outline-none focus:border-amber-500" />
          </div>
          <Button onClick={() => setStep(1)} disabled={!userData.ownerName} className="mx-auto">Continuar <ArrowRight size={20}/></Button>
        </div>
      );
      case 1: return (
        <div className="text-center space-y-6">
          <Dog size={60} className="mx-auto text-amber-600" />
          <h2 className="text-2xl font-bold">¿Cómo se llama tu perrito?</h2>
          <input type="text" value={userData.name} onChange={(e) => setUserData({...userData, name: e.target.value})} className="w-full max-w-xs p-4 border-2 rounded-xl text-center text-xl outline-none focus:border-amber-500" />
          <div className="flex justify-center gap-4"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft/></Button><Button onClick={() => setStep(2)} disabled={!userData.name}>Siguiente</Button></div>
        </div>
      );
      case 2: return (
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold">Datos de {userData.name}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 rounded-xl border">
              <label className="text-xs font-bold uppercase text-stone-500">Peso (kg)</label>
              <input type="number" value={userData.weight} onChange={(e) => setUserData({...userData, weight: e.target.value})} className="w-full text-center text-2xl font-bold bg-transparent outline-none" />
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border">
              <label className="text-xs font-bold uppercase text-stone-500">Edad (años)</label>
              <input type="number" value={userData.age} onChange={(e) => setUserData({...userData, age: e.target.value})} className="w-full text-center text-2xl font-bold bg-transparent outline-none" />
            </div>
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}>Atrás</Button><Button onClick={() => setStep(3)}>Siguiente</Button></div>
        </div>
      );
      case 3: return (
        <div className="space-y-6 text-center">
          <h2 className="text-2xl font-bold">Actividad Física</h2>
          <div className="grid grid-cols-3 gap-3">
            {['low', 'medium', 'high'].map(l => (
              <button key={l} onClick={() => setUserData({...userData, activity: l})} className={`p-6 rounded-xl border-2 ${userData.activity === l ? 'border-amber-500 bg-amber-50' : 'border-stone-200'}`}>{l === 'low' ? '🛋️' : l === 'medium' ? '🐕' : '⚡'}</button>
            ))}
          </div>
          <div className="flex justify-between"><Button variant="ghost" onClick={() => setStep(2)}>Atrás</Button><Button onClick={() => setStep(4)}>Siguiente</Button></div>
        </div>
      );
      case 4: return (
        <div className="space-y-4">
          <h2 className="text-center text-2xl font-bold">Casi listos...</h2>
          <input type="text" placeholder="Raza" value={userData.breed} onChange={(e) => setUserData({...userData, breed: e.target.value})} className="w-full p-3 border rounded-xl" />
          <textarea placeholder="Alergias o condiciones" value={userData.allergies} onChange={(e) => setUserData({...userData, allergies: e.target.value})} className="w-full p-3 border rounded-xl h-24" />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(3)}>Atrás</Button>
            <Button onClick={() => { 
                saveLead(true); 
                if (showQuoteMode) {
                  setStep(5); 
                } else {
                  alert("¡Lead guardado con éxito en el Master OPS!");
                  handleResetApp(); 
                }
              }}>
              {showQuoteMode ? "Calcular" : "Finalizar y Guardar"} <Sparkles/>
            </Button>
          </div>
        </div>
      );
      case 5: return (
        <div className="animate-fadeIn space-y-6">
          <div className="bg-stone-900 text-white p-6 rounded-2xl flex justify-between items-center shadow-xl">
            <div><h2 className="text-2xl font-bold">{userData.name}</h2><p className="text-amber-400 font-bold">{Math.round(calculations.grams)}g / día</p></div>
            <div className="text-right text-xs uppercase text-stone-400">Nutrición de Precisión</div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-t-4 border-green-600">
              <h3 className="font-bold text-green-800 mb-2 flex items-center gap-2"><HeartPulse size={18}/> Plan Vital</h3>
              <PriceTag final={calculations.vital.plan14} hideDiscount />
            </Card>
            <Card className="border-t-4 border-indigo-600 bg-indigo-50/30">
              <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2"><Sparkles size={18}/> Plan Signature</h3>
              <PriceTag original={calculations.signature.plan14.reg} final={calculations.signature.plan14.disc} label={`OFERTA -${config.discountSignature}%`} />
            </Card>
          </div>
          <div className="flex justify-center"><Button variant="outline" onClick={handleResetApp}>Nueva Consulta</Button></div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-stone-200 pb-10">
      <nav className="bg-stone-900 text-white p-4 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-2 font-bold uppercase tracking-tighter"><Leaf className="text-green-500"/> WUFY <span className="text-stone-500 font-light">TECH</span></div>
        <div className="flex items-center gap-2">
           <button onClick={() => setShowCajita(true)} className="p-2 bg-amber-600 rounded-full hover:bg-amber-500"><Package size={20}/></button>
           <button onClick={() => setShowAdmin(!showAdmin)} className="p-2 text-stone-400 hover:text-white"><Settings size={20}/></button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 pt-10">
        <Card className="min-h-[450px] flex flex-col justify-center">{renderStep()}</Card>
      </main>

      {showAdmin && (
        <div className="fixed right-4 top-20 w-80 bg-white shadow-2xl rounded-xl p-4 border animate-slideIn z-40">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-stone-700"><Settings size={16}/> IT Control Panel</h3>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-xs font-bold text-amber-800 uppercase">Modo Cotización</span>
                <button onClick={() => setShowQuoteMode(!showQuoteMode)} className={`p-1 rounded-md transition-colors ${showQuoteMode ? 'bg-amber-600 text-white' : 'bg-stone-300 text-stone-600'}`}>
                  {showQuoteMode ? <Eye size={18}/> : <EyeOff size={18}/>}
                </button>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DIRECCIÓN (REVISADO) */}
      {showCajita && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-0 overflow-hidden">
            <div className="bg-amber-600 p-4 text-white font-bold flex justify-between"><span>DATOS DE ENVÍO</span><button onClick={() => setShowCajita(false)}>✕</button></div>
            <div className="p-6 space-y-3">
              <input placeholder="Dirección" value={userData.address} onChange={(e) => setUserData({...userData, address: e.target.value})} className="w-full p-2 border rounded" />
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Edificio" value={userData.building} onChange={(e) => setUserData({...userData, building: e.target.value})} className="w-full p-2 border rounded" />
                <input placeholder="Apto" value={userData.apartment} onChange={(e) => setUserData({...userData, apartment: e.target.value})} className="w-full p-2 border rounded" />
              </div>
              {/* BOTÓN ACTUALIZADO PARA SINCRONIZAR */}
              <Button onClick={saveAddressToSheet} className="w-full">Guardar y Sincronizar</Button>
            </div>
          </Card>
        </div>
      )}

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
}
