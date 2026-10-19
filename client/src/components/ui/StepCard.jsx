const StepCard = ({ number = "01", title, description, icon }) => (
  <div className={`step-card step-card--${number}`}>
    <div className="step-icon" aria-hidden="true">
      {icon}
    </div>
    <div>
      <span className="step-number font-bold">{number}</span>
      <h3 className="font-bold text-lg mb-2 text-[var(--ink)]">{title}</h3>
      <p className="text-[14px] text-[var(--ink-soft)] leading-relaxed">
        {description}
      </p>
    </div>
  </div>
);
export default StepCard;
