import React from 'react';

const StatsCard = ({ value, label, sub, className = '' }) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
};

export default StatsCard;