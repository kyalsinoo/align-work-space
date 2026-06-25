import { motion } from "motion/react";
import { Users, CheckSquare, CalendarDays, Clock, Sparkles, Megaphone } from "lucide-react";

const steps = [
  { icon: Users, label: "Team" },
  { icon: CheckSquare, label: "Tasks" },
  { icon: CalendarDays, label: "Leave" },
  { icon: Clock, label: "Attendance" },
  { icon: Megaphone, label: "Announce" },
  { icon: Sparkles, label: "AI" },
];

export function HeroAnimation() {
  return (
    <div className="relative flex h-full min-h-[320px] items-center justify-center">
      {/* Pulsing rings — echo the logo's circle motif */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-primary/30"
          style={{ width: 220 + i * 70, height: 220 + i * 70 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.2, 0.5] }}
          transition={{ duration: 4, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
        />
      ))}

      {/* Stepped icon reveal, looping */}
      <div className="relative grid grid-cols-3 gap-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.label}
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-primary/20 bg-background/70 shadow-elegant backdrop-blur"
            initial={{ opacity: 0, scale: 0.4, y: 16 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.4], y: [16, 0, 0, 16] }}
            transition={{
              duration: 6,
              times: [0, 0.15, 0.85, 1],
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeInOut",
            }}
          >
            <s.icon className="h-7 w-7 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
