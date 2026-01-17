import React, { useEffect, useState } from "react";

/**
 * CravenFillCountdown
 * --------------------
 * Animated countdown that fills the Crave'n "C" logo with orange over time.
 *
 * Props:
 *  - duration: total seconds for the countdown (default: 15)
 *
 * Usage:
 *  <CravenFillCountdown duration={30} />
 */

const CravenFillCountdown = ({ duration = 15 }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const ratio = Math.min(elapsed / duration, 1);
      setProgress(ratio);
      setTimeLeft(Math.ceil(duration - elapsed));
      if (ratio >= 1) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [duration]);

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <svg
        viewBox="0 0 512 512"
        className="absolute inset-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Logo mask for the fill */}
          <clipPath id="craven-mask">
            <path d="M255.6,78 C150,78,66,162,66,267 C66,372,150,456,255.6,456 C333,456,401,408,430,337 L390,321 C369,366,319,397,263,397 C182,397,117,332,117,251 C117,170,182,105,263,105 C315,105,360,135,382,179 L424,160 C395,101,331,78,255.6,78 Z M430,266 C440,268,454,277,457,288 C460,298,453,311,440,316 C423,322,408,310,407,294 C406,282,417,265,430,266 Z M456,228 C462,231,471,241,470,250 C469,258,460,266,450,265 C438,263,431,252,433,241 C435,230,450,224,456,228 Z" />
          </clipPath>
        </defs>

        {/* Base grey "C" */}
        <path d="M255.6,78 C150,78,66,162,66,267 C66,372,150,456,255.6,456 C333,456,401,408,430,337 L390,321 C369,366,319,397,263,397 C182,397,117,332,117,251 C117,170,182,105,263,105 C315,105,360,135,382,179 L424,160 C395,101,331,78,255.6,78 Z M430,266 C440,268,454,277,457,288 C460,298,453,311,440,316 C423,322,408,310,407,294 C406,282,417,265,430,266 Z M456,228 C462,231,471,241,470,250 C469,258,460,266,450,265 C438,263,431,252,433,241 C435,230,450,224,456,228 Z" fill="#2a2a2a" />

        {/* Animated orange fill */}
        <rect
          x="0"
          y={512 * (1 - progress)}
          width="512"
          height={512 * progress}
          fill="#ff4f00"
          clipPath="url(#craven-mask)"
        />
      </svg>

      {/* Centered numeric countdown */}
      <div className="absolute text-white text-3xl font-bold drop-shadow-md">
        {timeLeft}s
      </div>
    </div>
  );
};

export default CravenFillCountdown;
