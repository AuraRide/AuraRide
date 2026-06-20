// Checkpoint affirmation messages with different contexts
export const checkpointMessages = {
  // Difficulty-based messages
  afterClimbing: [
    {
      message: "SPOT ON.",
      subtitle: "没有多余的力气被浪费，一切都刚刚好。",
    },
    {
      message: "ELEVATED.",
      subtitle: "你已登临，高度从不说谎。",
    },
    {
      message: "ANCHORED.",
      subtitle: "你准时停靠在了这里，正如预料。",
    },
  ],

  // Scenic/Quiet location messages
  scenic: [
    {
      message: "ARRIVED.",
      subtitle: "这段路程的静谧，是你应得的。",
    },
    {
      message: "PAUSED.",
      subtitle: "风景早已等候，你只是按时抵达。",
    },
    {
      message: "STILLED.",
      subtitle: "此处的寂静，为你而设。",
    },
  ],

  // High speed / Flow state messages
  flowing: [
    {
      message: "ALIGNED.",
      subtitle: "风的方向，证明你没有走错。",
    },
    {
      message: "SYNCED.",
      subtitle: "节奏恰到好处，路也认可。",
    },
    {
      message: "UNTETHERED.",
      subtitle: "速度是最诚实的回应。",
    },
  ],

  // Night riding messages
  night: [
    {
      message: "ANCHORED.",
      subtitle: "你准时停靠在了这里，正如预料。",
    },
    {
      message: "WITNESSED.",
      subtitle: "夜色记得每一个到访的人。",
    },
    {
      message: "SUBMERGED.",
      subtitle: "夜幕降临时，你没有迷路。",
    },
  ],

  // Midpoint / Continuation messages
  midway: [
    {
      message: "MARKED.",
      subtitle: "这是中点，也是起点。",
    },
    {
      message: "TRACED.",
      subtitle: "轨迹在此交汇，你并不孤单。",
    },
    {
      message: "LOGGED.",
      subtitle: "系统已记录，你的存在不可抹去。",
    },
  ],

  // Final checkpoint / Destination messages
  final: [
    {
      message: "COMPLETE.",
      subtitle: "终点线从不等人，除非你值得。",
    },
    {
      message: "SETTLED.",
      subtitle: "一切归于此处，恰如其分。",
    },
    {
      message: "CONCLUDED.",
      subtitle: "结束即开始，循环不止。",
    },
  ],
};

// Helper function to get appropriate message based on context
export function getCheckpointMessage(context: {
  isClimbing?: boolean;
  isScenic?: boolean;
  isHighSpeed?: boolean;
  isNight?: boolean;
  isFinal?: boolean;
  isMidway?: boolean;
}) {
  if (context.isFinal) {
    return checkpointMessages.final[
      Math.floor(Math.random() * checkpointMessages.final.length)
    ];
  }

  if (context.isClimbing) {
    return checkpointMessages.afterClimbing[
      Math.floor(Math.random() * checkpointMessages.afterClimbing.length)
    ];
  }

  if (context.isHighSpeed) {
    return checkpointMessages.flowing[
      Math.floor(Math.random() * checkpointMessages.flowing.length)
    ];
  }

  if (context.isNight) {
    return checkpointMessages.night[
      Math.floor(Math.random() * checkpointMessages.night.length)
    ];
  }

  if (context.isScenic) {
    return checkpointMessages.scenic[
      Math.floor(Math.random() * checkpointMessages.scenic.length)
    ];
  }

  if (context.isMidway) {
    return checkpointMessages.midway[
      Math.floor(Math.random() * checkpointMessages.midway.length)
    ];
  }

  // Default to scenic
  return checkpointMessages.scenic[
    Math.floor(Math.random() * checkpointMessages.scenic.length)
  ];
}
