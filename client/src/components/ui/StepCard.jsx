const StepCard = ({ number, title, description, icon }) => (
  <div className="bg-white border-2 border-black p-8 rounded-xl flex flex-col items-center text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full transition-transform hover:-translate-y-1">
    <div className="w-12 h-12 mb-4 flex items-center justify-center bg-zinc-100 rounded-full border-2 border-black">
      {icon}
    </div>
    <h3 className="font-bold text-xl mb-3 uppercase tracking-tight">
      {number}. {title}
    </h3>
    <p className="text-sm font-medium text-zinc-600 leading-relaxed">
      {description}
    </p>
  </div>
);

export default StepCard;
