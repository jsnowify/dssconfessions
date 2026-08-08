const StepCard = ({ title, description }) => (
  <div className="bg-white border-2 border-black p-8 rounded-xl flex flex-col items-start text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full transition-transform hover:-translate-y-1">
    <h3 className="font-bold text-xl mb-3 uppercase tracking-tight">{title}</h3>
    <p className="text-sm font-medium text-zinc-600 leading-relaxed">
      {description}
    </p>
  </div>
);

export default StepCard;
