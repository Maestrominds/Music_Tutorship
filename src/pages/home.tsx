import React, { useState, useEffect, useRef, type ReactNode } from "react";
import mentorPhoto from "@assets/DSC04596_1776341234157.webp";
import {
  type Variants,
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  animate,
} from "framer-motion";

// Typed cubic-bezier constant — avoids repeated `as [number,number,number,number]` casts
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const Counter = ({ from, to, duration = 2 }: { from: number, to: number, duration?: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(nodeRef, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const node = nodeRef.current;
    if (!node) return;
    const controls = animate(from, to, {
      duration,
      ease: "easeOut",
      onUpdate(value) {
        node.textContent = value.toFixed(0).padStart(2, '0');
      }
    });
    return () => controls.stop();
  }, [from, to, duration, inView]);

  return <span ref={nodeRef}>{from.toString().padStart(2, '0')}</span>;
};

const SectionDivider = () => (
  <div className="w-full flex justify-center items-center py-6 opacity-40">
    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent max-w-xs"></div>
    <div className="w-1.5 h-1.5 rotate-45 bg-primary mx-4"></div>
    <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/30 via-transparent to-transparent max-w-xs"></div>
  </div>
);

const TiltCard = ({
  children,
  className,
  intensity = 8,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  disabled?: boolean;
}) => {
  const xPct = useMotionValue(0);
  const yPct = useMotionValue(0);
  const rotateX = useSpring(useTransform(yPct, [-0.5, 0.5], [intensity, -intensity]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(xPct, [-0.5, 0.5], [-intensity, intensity]), { stiffness: 300, damping: 30 });
  const glowX = useTransform(xPct, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(yPct, [-0.5, 0.5], [0, 100]);
  // Must be unconditional — hook cannot live inside `{!disabled && (...)}` JSX
  const glowBackground = useTransform(
    [glowX, glowY],
    ([x, y]: number[]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(234,184,46,0.10) 0%, transparent 65%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    xPct.set((e.clientX - rect.left) / rect.width - 0.5);
    yPct.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    xPct.set(0);
    yPct.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={`relative ${className ?? ""}`}
    >
      {/* Dynamic glare — always rendered; opacity is driven by the motion value */}
      {!disabled && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
          style={{ background: glowBackground }}
        />
      )}
      {children}
    </motion.div>
  );
};

const useSpotlight = () => {
  const cursorX = useMotionValue(-1000);
  const cursorY = useMotionValue(-1000);
  const springX = useSpring(cursorX, { stiffness: 50, damping: 20 });
  const springY = useSpring(cursorY, { stiffness: 50, damping: 20 });
  useEffect(() => {
    // Skip cursor tracking entirely on touch devices — saves CPU & re-renders
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [cursorX, cursorY]);
  return { x: springX, y: springY };
};

export default function Home() {
  const { scrollYProgress, scrollY } = useScroll();
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const reverseParallaxY = useTransform(scrollYProgress, [0, 1], [0, -150]);

  const [navScrolled, setNavScrolled] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [commitment, setCommitment] = useState("");
  const [musicLink, setMusicLink] = useState("");
  const [bottleneck, setBottleneck] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(() => localStorage.getItem("mt_submitted") === "1");
  const spotlight = useSpotlight();

  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    return scrollY.on("change", (latest) => {
      setNavScrolled(latest > 50);
    });
  }, [scrollY]);

  const btnX = useMotionValue(0);
  const btnY = useMotionValue(0);
  const btnSpringX = useSpring(btnX, { stiffness: 150, damping: 15, mass: 0.1 });
  const btnSpringY = useSpring(btnY, { stiffness: 150, damping: 15, mass: 0.1 });

  const handleBtnMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isTouch) return;
    const rect = e.currentTarget.getBoundingClientRect();
    btnX.set(((e.clientX - rect.left) - rect.width / 2) * 0.3);
    btnY.set(((e.clientY - rect.top) - rect.height / 2) * 0.3);
  };

  const handleBtnMouseLeave = () => {
    btnX.set(0);
    btnY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || !commitment) return;
    setSubmitError(null);
    setSubmitting(true);
    const formData = {
      music_link: musicLink,
      bottleneck,
      commitment,
    };

    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const payload = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Submission failed. Please try again in a moment.");
      }

      localStorage.setItem("mt_submitted", "1");
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Submission failed. Please try again in a moment.");
      console.error("Internal error occurred", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Must be at top level — calling a hook inside JSX return violates Rules of Hooks
  const spotlightBackground = useTransform(
    [spotlight.x, spotlight.y],
    ([x, y]: number[]) =>
      `radial-gradient(500px circle at ${x}px ${y}px, rgba(234,184,46,0.04), transparent 40%)`
  );

  const wordAnimation: Variants = {
    hidden: { opacity: 0, y: 60, filter: "blur(8px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 1.4, ease: EASE_OUT } },
  };

  const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } },
  };

  const months = [
    { num: "01", title: "Production Foundations", items: ["Rhythm, Groove, Scales & Chords", "Sound Selection & Session Flow", "Drum Programming & Grooves", "Logic Pro Workflow & MIDI"] },
    { num: "02", title: "Sound Design & Creative", items: ["Synthesis & Sound Design", "Designing Bass, Leads & Pads", "Sampling & Creative Loops", "Layering, Automation & FX"] },
    { num: "03", title: "Arrangement & Finishing", items: ["Song Structure & Arrangement", "Reference Tracks & Finishing", "Mixing: EQ, Compression, FX", "Vocal Production & AI Tools"] },
    { num: "04", title: "Professional Release", items: ["Song Production with Real Musicians", "Recording, Arrangement & Final Mix", "Cover Artwork & Promotional Assets", "Official Record Label Release"] }
  ];

  return (
    <div className="relative bg-background text-foreground min-h-screen overflow-x-hidden">
      {/* ── Fixed header: banner + nav in one stacking context ── */}
      <div className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${navScrolled ? "bg-background/90 backdrop-blur-md" : ""}`}>
        {/* Notification Banner */}
        <div
          className="w-full px-4 sm:px-6 py-2 sm:py-2.5 text-center"
          style={{
            background: "linear-gradient(90deg, rgba(184,116,14,0.22) 0%, rgba(234,184,46,0.14) 50%, rgba(184,116,14,0.22) 100%)",
            borderBottom: "1px solid rgba(234,184,46,0.35)",
          }}
        >
          <p className="text-[11px] sm:text-xs tracking-[0.12em] text-foreground/90 font-light leading-snug max-w-3xl mx-auto">
            <span className="text-primary mr-1.5">◆</span>
            {/* Short version for small screens, full for sm+ */}
            <span className="sm:hidden">Info received via Meta - review details &amp; submit your portfolio below.</span>
            <span className="hidden sm:inline">Your contact information has been securely received via Meta. Please review the program details below and submit your portfolio.</span>
          </p>
        </div>

        {/* Nav */}
        <nav className={`w-full px-4 sm:px-6 md:px-12 py-3.5 sm:py-4 md:py-5 flex justify-between items-center transition-all duration-500 ${navScrolled ? "border-b border-border/50" : "bg-transparent"}`}>
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="font-sans uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.25em] flex items-center gap-2"
          >
            <div className="w-2 h-2 bg-primary rotate-45 shrink-0"></div>
            Music / <span className="text-primary ml-1">Tutorship</span>
          </motion.div>
          <motion.a
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            href="#apply-form"
            data-testid="link-apply-nav"
            className="relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest font-medium whitespace-nowrap overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #c88018 0%, #eabc32 45%, #f7e07a 60%, #eabc32 75%, #b87010 100%)",
              boxShadow: "0 0 18px rgba(234,184,46,0.45), 0 2px 8px rgba(0,0,0,0.4)",
              color: "#1a0e00",
            }}
          >
            <span className="relative z-10 hidden sm:inline">Secure My Seat</span>
            <span className="relative z-10 sm:hidden">Apply Now</span>
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, #eabc32 0%, #f7e07a 50%, #eabc32 100%)" }}
            />
          </motion.a>
        </nav>
      </div>

      {/* Scroll Progress Line */}
      <motion.div
        className="fixed top-0 right-0 w-[2px] bg-primary/60 z-50 origin-top"
        style={{ scaleY: scrollYProgress, height: "100vh" }}
      />

      {/* Global Cursor Spotlight */}
      <motion.div
        className="pointer-events-none fixed inset-0 z-40"
        style={{ background: spotlightBackground }}
      />

      {/* HERO — clamp() top-padding keeps content vertically balanced on all mobile heights */}
      <section className="relative flex flex-col px-4 sm:px-8 md:px-12 lg:px-20 pt-[clamp(140px,22dvh,260px)] sm:pt-[148px] md:pt-[156px] pb-10 sm:pb-14 md:pb-16 min-h-dvh sm:min-h-0">
        {/* Background orb */}
        <motion.div
          style={{ y: parallaxY }}
          className="absolute -top-32 -right-32 w-[50vw] h-[50vw] bg-primary/5 rounded-full blur-[100px] pointer-events-none"
        />

        {/* Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="text-primary text-[10px] sm:text-xs uppercase tracking-[0.18em] sm:tracking-[0.4em] mb-5 sm:mb-3 md:mb-6 flex items-center gap-3 sm:gap-5 relative z-10"
        >
          <span className="w-7 sm:w-10 h-[1px] bg-primary/50" />
          A Four-Month Mentorship
        </motion.div>

        {/* Heading */}
        <motion.h1
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="font-serif text-[clamp(1.9rem,11vw,8.5rem)] leading-[0.9] sm:leading-[0.88] tracking-tighter uppercase flex flex-col relative z-10 text-3d"
        >
          <div className="overflow-hidden pb-1">
            <motion.span variants={wordAnimation} className="inline-block">PRODUCER</motion.span>
          </div>
          <div className="overflow-hidden pb-1 ml-[3vw] sm:ml-[6vw] md:ml-[8vw]">
            <motion.span variants={wordAnimation} className="inline-block italic text-primary/80 lowercase">Transformation</motion.span>
          </div>
          <div className="overflow-hidden pb-1">
            <motion.span variants={wordAnimation} className="inline-block">PATH</motion.span>
          </div>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.9 }}
          className="mt-7 sm:mt-3 md:mt-6 text-[15px] sm:text-base text-foreground/80 max-w-full sm:max-w-sm md:max-w-lg font-light leading-relaxed tracking-wide relative z-10"
        >
          Taking you from an aspiring producer to a commercially released artist.
        </motion.p>

        {/* Stats card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.2 }}
          className="mt-10 sm:mt-5 md:mt-8 relative z-10 w-full"
        >
          <div
            className="grid grid-cols-3 w-full rounded-sm overflow-hidden"
            style={{
              border: "1px solid rgba(234,184,46,0.22)",
              background: "rgba(255,255,255,0.02)",
              boxShadow: "0 0 60px rgba(234,184,46,0.07), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {[
              { count: 4,  label: "Months",          mobileLabel: "Months" },
              { count: 13, label: "Students Max",    mobileLabel: "Seats" },
              { count: 1,  label: "Official Release", mobileLabel: "Release" },
            ].map(({ count, label, mobileLabel }, i) => (
              <div
                key={label}
                className={`flex flex-col items-center justify-center gap-1 sm:gap-1.5 py-4 sm:py-3 md:py-5 px-1.5 sm:px-4${i < 2 ? " border-r" : ""}`}
                style={i < 2 ? { borderRightColor: "rgba(234,184,46,0.15)" } : undefined}
              >
                <span
                  className="font-serif leading-none tabular-nums block"
                  style={{
                    fontSize: "clamp(1.85rem, 7vw, 3.2rem)",
                    padding: "0.1em 0.05em",
                    background: "linear-gradient(150deg, #c88018 0%, #eabc32 35%, #f7e07a 55%, #eabc32 70%, #b87010 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    filter: "drop-shadow(0 0 14px rgba(234,184,46,0.35))",
                  }}
                >
                  <Counter from={0} to={count} />
                </span>
                <span className="sm:hidden text-foreground/65 text-[10px] uppercase tracking-[0.1em] text-center leading-tight whitespace-nowrap">
                  {mobileLabel}
                </span>
                <span className="hidden sm:block text-foreground/65 text-[11px] uppercase tracking-[0.15em] text-center leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Scroll indicator — mobile only, pressed to the bottom of the full-height hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="mt-auto sm:hidden pt-8 pb-2 flex flex-col items-start gap-2 relative z-10"
        >
          <span className="text-[9px] uppercase tracking-[0.45em] text-foreground/25">Scroll</span>
          <motion.div
            animate={{ scaleY: [1, 0.2, 1] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-[1px] h-7 bg-gradient-to-b from-primary/40 to-transparent origin-top"
          />
        </motion.div>
      </section>

      {/* MARQUEE */}
      <div className="w-full overflow-hidden gold-texture text-[#1a0e00] py-3 md:py-4 border-y border-primary/30 flex whitespace-nowrap">
        <div className="flex animate-marquee font-sans font-medium text-xs tracking-[0.3em] uppercase shrink-0">
          {Array(6).fill("PRODUCE · RELEASE · TRANSFORM · MASTER · CREATE · DISTRIBUTE · ").map((text, i) => (
            <span key={i} className="mx-4">{text}</span>
          ))}
        </div>
      </div>

      {/* THE CHALLENGE */}
      <section className="py-12 sm:py-20 md:py-36 px-5 md:px-12 lg:px-20 bg-[#040404]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={wordAnimation} className="flex items-center gap-4 mb-6">
            <div className="w-2 h-2 bg-primary rotate-45 shrink-0"></div>
            <span className="text-primary text-xs tracking-[0.3em] uppercase">The Reality</span>
          </motion.div>
          <motion.h2 variants={wordAnimation} className="font-serif text-[clamp(1.875rem,8.5vw,3.75rem)] md:text-6xl mb-7 md:mb-16 max-w-3xl leading-tight">
            Why most never reach their <span className="italic text-primary/80">potential.</span>
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-7 md:gap-10" style={{ perspective: "1200px" }}>
            {[
              { title: "Nothing Gets Finished", desc: "The gap between a loop and a released song is enormous. Most never bridge it, leaving hard drives full of unfinished potential." },
              { title: "No Expert Mentorship", desc: "Without professional feedback, bad habits compound invisibly. You don't know what you don't know until an expert points it out." },
              { title: "No Structured Path", desc: "Scattered tutorials create critical gaps in knowledge. Years pass without real, measurable growth in your sonic signature." }
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 1, ease: "easeOut" } } }}
              >
                <TiltCard
                  disabled={isTouch}
                  intensity={6}
                  className="group relative pl-5 sm:pl-6 py-5 sm:py-6 border-l border-primary/20 hover:border-primary transition-all duration-700 flex flex-col gap-3 sm:gap-4 h-full"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  <div className="absolute top-0 -left-[1px] w-[1px] h-0 bg-primary group-hover:h-full transition-all duration-700 ease-out" />
                  <h3 className="text-xl md:text-2xl font-serif text-foreground group-hover:translate-x-1.5 transition-transform duration-500">{card.title}</h3>
                  <p className="text-foreground/80 leading-loose font-light text-base group-hover:text-foreground transition-colors duration-500">{card.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* PROGRAM STRUCTURE */}
      <section className="py-12 sm:py-20 md:py-36 px-5 md:px-12 lg:px-20">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="mb-8 md:mb-20"
          >
            <motion.div variants={wordAnimation} className="flex items-center gap-4 mb-6">
              <div className="w-2 h-2 bg-primary rotate-45 shrink-0"></div>
              <span className="text-primary text-xs tracking-[0.3em] uppercase">The Timeline</span>
            </motion.div>
            <motion.h2 variants={wordAnimation} className="font-serif text-[clamp(1.875rem,8.5vw,5.25rem)] md:text-6xl lg:text-7xl leading-tight">
              Four months to <span className="italic text-primary/80">Mastery.</span>
            </motion.h2>
          </motion.div>

          <div className="flex flex-col gap-0 divide-y divide-border/30" style={{ perspective: "1600px" }}>
            {months.map((month, i) => {
              const fromLeft = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.4 }}
                  className={`group relative py-8 sm:py-12 md:py-24 flex flex-col md:flex-row gap-5 sm:gap-8 md:gap-0 items-start md:items-center overflow-hidden ${fromLeft ? '' : 'md:flex-row-reverse'}`}
                >
                  {/* Hover sweep */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                  {/* Ghost watermark */}
                  <motion.div
                    style={{ y: fromLeft ? parallaxY : reverseParallaxY }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden"
                  >
                    <span
                      className="font-serif leading-none text-[6rem] md:text-[22rem] text-transparent"
                      style={{ WebkitTextStroke: "1px rgba(234,184,46,0.035)" }}
                    >
                      {month.num}
                    </span>
                  </motion.div>

                  {/* ── BIG MONTH NUMBER ── */}
                  <motion.div
                    initial={{ opacity: 0, x: fromLeft ? -60 : 60 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 1, ease: EASE_OUT }}
                    className={`relative z-10 shrink-0 flex flex-col gap-1 w-full md:w-56 lg:w-72 ${fromLeft ? 'md:items-end md:text-right' : 'md:items-start md:text-left'}`}
                  >
                    <span className="text-[10px] uppercase tracking-[0.45em] text-primary/80 font-sans">Month</span>
                    <span
                      className="font-serif leading-none tracking-tighter select-none block"
                      style={{
                        fontSize: "clamp(2.8rem, 10vw, 10rem)",
                        padding: "0.12em 0.04em",
                        background: "linear-gradient(150deg, #c88018 0%, #eabc32 35%, #f7e07a 55%, #eabc32 70%, #b87010 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: "drop-shadow(0 0 20px rgba(234,184,46,0.25))",
                      }}
                    >
                      {month.num}
                    </span>
                  </motion.div>

                  {/* Vertical divider line */}
                  <motion.div
                    initial={{ scaleY: 0 }}
                    whileInView={{ scaleY: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                    className="hidden md:block w-[1px] self-stretch bg-primary/20 mx-8 lg:mx-14 shrink-0 origin-top"
                  />

                  {/* Content */}
                  <motion.div
                    initial={{ opacity: 0, x: fromLeft ? 50 : -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 1, delay: 0.2, ease: EASE_OUT }}
                    className="relative z-10 flex-1 w-full md:w-auto"
                  >
                    <motion.h3
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT }}
                      className="font-serif text-[clamp(1.25rem,5.5vw,2.5rem)] md:text-4xl lg:text-5xl mb-4 sm:mb-6 md:mb-8 tracking-tight"
                    >
                      {month.title}
                    </motion.h3>
                    <ul className="space-y-3">
                      {month.items.map((item, j) => (
                        <motion.li
                          key={j}
                          initial={{ opacity: 0, x: fromLeft ? 30 : -30 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.7, delay: 0.45 + j * 0.1, ease: "easeOut" }}
                          className="flex items-center gap-3 sm:gap-4 text-foreground/85 text-base"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0" />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <SectionDivider />

      {/* THE CULMINATION */}
      <section className="py-12 sm:py-20 md:py-36 px-5 md:px-12 bg-[#040404] border-y border-border/30 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto relative z-10"
        >
          <motion.div variants={wordAnimation} className="text-primary text-xs tracking-[0.3em] uppercase mb-6 flex justify-center items-center gap-4">
            <span className="w-8 h-[1px] bg-primary/50"></span>
            The Culmination
            <span className="w-8 h-[1px] bg-primary/50"></span>
          </motion.div>
          <motion.h2 variants={wordAnimation} className="font-serif text-[clamp(1.875rem,8.5vw,3.75rem)] md:text-6xl mb-7 md:mb-16 max-w-3xl mx-auto text-center leading-tight">
            Your music released. <span className="italic text-primary">Officially.</span>
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-8 md:mb-16" style={{ perspective: "1400px" }}>
            {[
              { title: "Production", desc: "Creative direction, Studio recording, and the integration of Live instruments." },
              { title: "Finishing", desc: "Meticulous arrangement refinement, mastering the final mix, and bespoke cover artwork." },
              { title: "Release", desc: "Professional designs for official music releases distributed across all streaming platforms." }
            ].map((card, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 50 }, visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: EASE_OUT } } }}
              >
                <TiltCard
                  disabled={isTouch}
                  intensity={7}
                  className="group bg-background border border-border p-5 md:p-10 text-left transition-all duration-700 hover:border-primary/40 relative overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
                >
                  <div className="absolute top-0 right-0 p-5 text-5xl font-serif text-border/30 group-hover:text-primary/10 transition-colors duration-700">
                    {(i + 1).toString().padStart(2, '0')}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                  <h3 className="font-serif text-2xl md:text-3xl mb-4 text-foreground relative z-10">{card.title}</h3>
                  <p className="text-foreground/80 font-light leading-relaxed relative z-10">{card.desc}</p>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          <motion.p variants={wordAnimation} className="font-serif italic text-[clamp(1rem,4vw,1.25rem)] md:text-4xl max-w-4xl mx-auto text-center text-foreground/90 leading-relaxed md:leading-tight">
            "Produce one complete song and release it commercially through a leading record label. From the very first idea to global streaming platforms."
          </motion.p>
        </motion.div>
      </section>

      {/* THE MENTOR */}
      <section className="py-12 sm:py-20 md:py-36 px-5 md:px-12 lg:px-20">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-24 items-start lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex-1 flex flex-col items-start"
          >
            <motion.div variants={wordAnimation} className="flex items-center gap-4 mb-5 md:mb-8">
              <div className="w-2 h-2 bg-primary rotate-45 shrink-0"></div>
              <span className="text-primary text-xs tracking-[0.3em] uppercase">The Mentor</span>
            </motion.div>
            <motion.h2 variants={wordAnimation} className="font-serif text-[clamp(2.25rem,10vw,4.5rem)] md:text-7xl mb-4 tracking-tighter leading-none">
              L.J. <span className="italic text-primary">Vijay</span>
            </motion.h2>
            <motion.div variants={wordAnimation} className="text-xs tracking-[0.2em] uppercase text-foreground/75 mb-5 pb-5 md:mb-8 md:pb-8 border-b border-border/50 w-full">
              Credits: Ghibran, Vijay Antony, D Imman, C Sathya & Vishal C
            </motion.div>
            <motion.p variants={wordAnimation} className="text-foreground/90 font-light text-base md:text-lg leading-loose mb-7 md:mb-10">
              An industry veteran dedicated to cultivating the next generation of sound. By demystifying the complex production landscape, L.J. Vijay provides an uncompromised, structured approach to modern music creation.
            </motion.p>

            <motion.blockquote
              variants={staggerContainer}
              className="pl-6 border-l-2 border-primary font-serif italic text-[clamp(1.05rem,4.5vw,1.875rem)] md:text-3xl text-foreground/90 leading-snug"
            >
              {"Music production is ultimately about storytelling, emotion, and connecting with listeners, not just technical execution.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  variants={{ hidden: { opacity: 0, y: 15 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7 } } }}
                  className="inline-block mr-2 mb-1"
                >
                  {word}
                </motion.span>
              ))}
            </motion.blockquote>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            viewport={{ once: true }}
            className="w-full lg:flex-1 max-w-md lg:max-w-none mx-auto lg:mx-0 aspect-square sm:aspect-[4/3] lg:aspect-[3/4] bg-[#050505] border border-border/50 relative overflow-hidden animate-pulse-glow lg:self-stretch"
          >
            {/* Photo — covers the full frame, face kept centered */}
            <img
              src={mentorPhoto}
              alt="L.J. Vijay — Music Producer & Mentor"
              className="absolute inset-0 w-full h-full object-cover object-[40%_20%]"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              draggable={false}
            />

            {/* Gradient vignette — darkens edges, blends with page bg */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, rgba(7,7,7,0.60) 0%, transparent 40%), " +
                  "linear-gradient(to right, rgba(7,7,7,0.30) 0%, transparent 50%), " +
                  "linear-gradient(to bottom, rgba(7,7,7,0.20) 0%, transparent 30%)",
              }}
            />

            {/* Subtle gold tone overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,rgba(234,184,46,0.07)_0%,transparent_65%)] pointer-events-none" />

            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-primary/50 pointer-events-none" />
            <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-primary/50 pointer-events-none" />
            <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-primary/50 pointer-events-none" />
            <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-primary/50 pointer-events-none" />
          </motion.div>
        </div>
      </section>

      {/* CREDIBILITY / DISCOGRAPHY */}
      <section className="py-12 sm:py-20 md:py-36 px-5 md:px-12 lg:px-20 bg-[#040404] border-y border-border/30">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={staggerContainer}
          className="max-w-6xl mx-auto"
        >
          <motion.div variants={wordAnimation} className="flex items-center gap-4 mb-6">
            <div className="w-2 h-2 bg-primary rotate-45 shrink-0"></div>
            <span className="text-primary text-xs tracking-[0.3em] uppercase">Proven Track Record</span>
          </motion.div>
          <motion.h2 variants={wordAnimation} className="font-serif text-[clamp(1.875rem,8.5vw,3.75rem)] md:text-6xl mb-4 leading-tight">
            Music you've already <span className="italic text-primary/80">heard.</span>
          </motion.h2>
          <motion.p variants={wordAnimation} className="text-foreground/80 font-light text-base md:text-lg mb-8 md:mb-16 max-w-2xl leading-relaxed">
            L.J. Vijay's production work spans chart-topping films, platinum artists, and acclaimed composers across the industry. These are the releases that built the expertise behind this mentorship.
          </motion.p>

          {/* Spotify embed — full width block */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 1.2, ease: EASE_OUT } } }}
            className="mb-6"
          >
            {/* Mobile: compact player card with open-in-Spotify CTA */}
            <div className="sm:hidden flex flex-col gap-3">
              <div
                className="relative rounded-xl overflow-hidden border border-border/40 shadow-[0_0_40px_rgba(234,184,46,0.07)]"
                style={{ background: "rgba(255,255,255,0.02)" }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,184,46,0.05)_0%,transparent_70%)] pointer-events-none z-10" />
                <iframe
                  data-testid="embed-spotify-playlist"
                  style={{ display: "block", border: 0 }}
                  src="https://open.spotify.com/embed/playlist/1Baqr6iqDkXbHUCXXK8ThG?utm_source=generator&theme=0"
                  width="100%"
                  className="h-[420px]"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
              <a
                href="https://open.spotify.com/playlist/1Baqr6iqDkXbHUCXXK8ThG"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-lg border border-primary/30 text-primary text-xs uppercase tracking-[0.2em] font-medium transition-colors duration-300 hover:bg-primary/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Open full playlist in Spotify
              </a>
              <p className="text-[10px] text-muted-foreground/35 font-light text-center tracking-wide leading-relaxed">
                A curated selection of L.J. Vijay's productions &amp; collaborations.
              </p>
            </div>

            {/* sm+ : standard tall embed */}
            <div className="hidden sm:block">
              <div className="relative rounded-2xl overflow-hidden border border-border/40 shadow-[0_0_80px_rgba(234,184,46,0.09)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(234,184,46,0.04)_0%,transparent_60%)] pointer-events-none z-10" />
                <iframe
                  style={{ display: "block", border: 0 }}
                  src="https://open.spotify.com/embed/playlist/1Baqr6iqDkXbHUCXXK8ThG?utm_source=generator&theme=0"
                  width="100%"
                  className="h-[340px] md:h-[460px]"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground/40 font-light text-center tracking-wide">
                A curated selection of productions, arrangements, and collaborations spanning L.J. Vijay's career.
              </p>
            </div>
          </motion.div>

          {/* Credibility stats — horizontal row below embed */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-5 border-t border-l border-border/30 rounded-xl overflow-hidden"
          >
            {[
              { label: "Experience",    value: "10+ Years",                              mobileValue: "10+ Years" },
              { label: "Genres",        value: "Film · Pop · Electronic · World",        mobileValue: "Film · Pop · Electronic" },
              { label: "Collaborators", value: "Ghibran · Vijay Antony · D Imman · C Sathya · Vishal C", mobileValue: "Ghibran · Vijay Antony · D Imman +" },
              { label: "Specialisation",value: "Production · Mixing · Sound Design",    mobileValue: "Production · Mixing" },
              { label: "Philosophy",    value: "Structured. Creative. Commercially Oriented.", mobileValue: "Structured. Creative." },
            ].map(({ label, value, mobileValue }, i) => (
              <motion.div
                key={label}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.08 } } }}
                className={`group flex flex-col gap-2 sm:gap-3 px-3 sm:px-5 py-4 sm:py-6 md:px-6 md:py-8 border-r border-b border-border/30 bg-[#070707] hover:bg-[#0d0d0d] transition-colors duration-500${i === 4 ? " col-span-2 lg:col-span-1" : ""}`}
              >
                <span className="text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-primary/85">{label}</span>
                <span className="sm:hidden text-[11px] text-foreground/85 font-light leading-snug">{mobileValue}</span>
                <span className="hidden sm:block text-xs sm:text-sm text-foreground/90 font-light leading-snug">{value}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <SectionDivider />

      {/* IS THIS FOR YOU? */}
      <section className="py-12 sm:py-20 md:py-32 px-5 md:px-12 bg-[#040404]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="max-w-5xl mx-auto w-full"
        >
          <motion.div variants={wordAnimation} className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-8 pb-6 md:mb-12 md:pb-8 border-b border-border/40">
            <div>
              <div className="text-primary text-xs tracking-[0.3em] uppercase mb-3">Designed For The Serious</div>
              <h2 className="font-serif text-[clamp(2rem,9vw,3.75rem)] md:text-5xl lg:text-6xl leading-none">Is this for you?</h2>
            </div>
            <p className="text-foreground/75 text-sm font-light max-w-xs leading-relaxed md:text-right">
              Five defining criteria. Honest, unfiltered.
            </p>
          </motion.div>

          <div className="flex flex-col">
            {[
              "A working professional or student serious about mastering music production.",
              "An intermediate producer ready to elevate both creative and technical skills.",
              "A musician who desires to produce, finish, and commercially release their own music.",
              "Someone who struggles to complete tracks and requires a proven, structured system.",
              "An aspiring producer who understands the distinct value of structured mentorship."
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } } }}
                className="group relative flex flex-row items-center gap-3 sm:gap-5 md:gap-10 py-4 sm:py-5 md:py-6 border-b border-border/30 overflow-hidden cursor-default transition-all duration-300"
              >
                {/* Sweep background */}
                <div className="absolute inset-0 bg-primary/[0.09] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-out pointer-events-none" />
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-center rounded-r-full pointer-events-none" />
                <span className="font-serif text-xl md:text-2xl text-primary/30 group-hover:text-primary transition-colors duration-300 shrink-0 w-8 text-right pl-2">
                  {(i + 1).toString().padStart(2, '0')}
                </span>
                <div className="w-[1px] h-6 bg-border/40 group-hover:bg-primary/40 shrink-0 transition-colors duration-300" />
                <p className="relative z-10 font-serif text-base md:text-xl lg:text-2xl text-foreground/75 group-hover:text-foreground transition-colors duration-300 leading-snug">
                  {item}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA */}
      <section
        id="apply"
        className="relative overflow-hidden bg-background"
      >
        {/* Decorative background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(234,184,46,0.10)_0%,transparent_100%)] pointer-events-none" />

        {/* Single unified column — heading + form share one max-width */}
        <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 md:py-10 flex flex-col items-center text-center">

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="w-full flex flex-col items-center"
          >
            {/* Badge */}
            <motion.div
              variants={wordAnimation}
              className="inline-flex items-center gap-2 text-primary text-[10px] sm:text-xs tracking-[0.4em] uppercase mb-4 sm:mb-5 border border-primary/30 px-4 py-1.5 rounded-full"
            >
              <span className="w-1 h-1 rounded-full bg-primary/60 inline-block" />
              Limited to 13 Students
            </motion.div>

            {/* Heading */}
            <motion.h2
              variants={wordAnimation}
              className="w-full font-serif text-[1.7rem] sm:text-4xl md:text-5xl mb-5 sm:mb-7 md:mb-8 uppercase tracking-tighter leading-[0.9] text-3d"
            >
              Step into<br />
              <span className="italic text-primary/90 lowercase">the studio.</span>
            </motion.h2>

            {submitted ? (
              /* ── THANK YOU CARD ── */
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
                data-testid="thankyou-card"
                className="w-full flex flex-col items-center text-center rounded px-6 py-10 sm:px-10 sm:py-14"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(234,184,46,0.28)",
                  boxShadow: "0 0 80px rgba(234,184,46,0.09), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* Gold diamond icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
                  className="w-10 h-10 bg-primary rotate-45 mb-8 flex items-center justify-center"
                  style={{ filter: "drop-shadow(0 0 18px rgba(234,184,46,0.5))" }}
                />
                <p className="text-primary text-[10px] uppercase tracking-[0.4em] mb-4">
                  Application Received
                </p>
                <h3 className="font-serif text-3xl sm:text-4xl mb-5 leading-tight">
                  Thank you for<br />
                  <span className="italic text-primary/90">your submission.</span>
                </h3>
                <p className="text-foreground/70 font-light text-sm leading-loose max-w-sm">
                  Your portfolio has been sent for personal review by L.J. Vijay. You will receive a response within <span className="text-foreground/85">72 hours</span> via the contact details you provided.
                </p>
                <div className="mt-8 w-12 h-[1px] bg-primary/30 mx-auto" />
                <p className="mt-4 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">
                  Seats available · 13 maximum
                </p>
              </motion.div>
            ) : (
              <>
                {/* Application form */}
                <motion.form
                  id="apply-form"
                  variants={wordAnimation}
                  onSubmit={handleSubmit}
                  data-testid="form-portfolio"
                  className="w-full flex flex-col mt-3 sm:mt-5 px-5 sm:px-8 py-6 sm:py-8 rounded-sm"
                  style={{
                    scrollMarginTop: "130px",
                    background: "rgba(255,255,255,0.028)",
                    border: "1px solid rgba(234,184,46,0.28)",
                    boxShadow: "0 0 60px rgba(234,184,46,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  {/* Step 01 — Music link */}
                  <div className="flex flex-col text-left mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-2 flex-wrap mb-3">
                      <span className="text-[0.6rem] text-primary/40 font-mono tracking-widest">01</span>
                      <label htmlFor="music-link" className="text-[0.8rem] uppercase tracking-[0.2em] text-primary font-semibold">
                        Music Link
                      </label>
                      <span className="text-xs tracking-wide text-muted-foreground/60 italic normal-case">— optional</span>
                    </div>
                    <input
                      id="music-link"
                      type="text"
                      inputMode="url"
                      placeholder="SoundCloud, Drive, YouTube, Spotify — any link works"
                      data-testid="input-music-link"
                      value={musicLink}
                      onChange={(e) => setMusicLink(e.target.value)}
                      className="w-full bg-transparent py-3 text-sm sm:text-base text-foreground placeholder:text-white/35 outline-none focus:outline-none transition-colors duration-300"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.30)" }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--primary))")}
                      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.30)")}
                    />
                    <p className="mt-2.5 text-xs sm:text-sm text-muted-foreground/70 font-light leading-relaxed">
                      No link yet?{" "}
                      <span style={{ color: "#c9a84c" }}>Skip this — your application is still complete.</span>
                    </p>
                  </div>

                  {/* Step 02 — Bottleneck */}
                  <div className="flex flex-col text-left mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-[0.6rem] text-primary/40 font-mono tracking-widest">02</span>
                      <label htmlFor="bottleneck" className="text-[0.8rem] uppercase tracking-[0.2em] text-primary font-semibold">
                        Your Bottleneck
                      </label>
                    </div>
                    <span className="block text-foreground/70 text-sm sm:text-base mb-3">
                      What stops you from finishing and releasing tracks?
                    </span>
                    <textarea
                      id="bottleneck"
                      rows={3}
                      placeholder="e.g. I always get stuck in the mixing stage and never know when a track is finished…"
                      data-testid="input-bottleneck"
                      required
                      value={bottleneck}
                      onChange={(e) => setBottleneck(e.target.value)}
                      className="w-full bg-transparent py-3 text-sm sm:text-base text-foreground placeholder:text-white/30 outline-none focus:outline-none resize-none transition-colors duration-300"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.30)" }}
                      onFocus={(e) => (e.currentTarget.style.borderBottomColor = "hsl(var(--primary))")}
                      onBlur={(e) => (e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.30)")}
                    />
                  </div>

                  {/* Step 03 — Financial Commitment */}
                  <div className="flex flex-col text-left mb-6 sm:mb-8">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-[0.6rem] text-primary/40 font-mono tracking-widest">03</span>
                      <label className="text-[0.8rem] uppercase tracking-[0.2em] text-primary font-semibold">
                        Financial Commitment
                      </label>
                    </div>
                    <div
                      className="flex flex-col rounded overflow-hidden"
                      style={{
                        border: `1px solid ${commitment ? "rgba(234,184,46,0.50)" : "rgba(255,255,255,0.20)"}`,
                        transition: "border-color 0.3s",
                      }}
                    >
                      {[
                        { value: "ready", label: "I understand this requires an investment of ₹1,59,000, and I have the capital ready if accepted." },
                        { value: "plan",  label: "I am highly interested but would need to discuss payment plan options." },
                        { value: "no",    label: "I cannot commit to this financial level at this time." },
                      ].map(({ value, label }, idx, arr) => {
                        const selected = commitment === value;
                        const isLast = idx === arr.length - 1;
                        return (
                          <button
                            key={value}
                            type="button"
                            data-testid={`commitment-${value}`}
                            onClick={() => setCommitment(value)}
                            className="flex items-start gap-3 px-4 py-3.5 sm:px-5 sm:py-4 text-left cursor-pointer transition-all duration-300 hover:bg-white/[0.05]"
                            style={{
                              backgroundColor: selected ? "rgba(234,184,46,0.10)" : "transparent",
                              borderBottom: isLast ? "none" : "1px solid rgba(255,255,255,0.10)",
                            }}
                          >
                            <span
                              className="mt-[3px] shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300"
                              style={{
                                width: "18px",
                                height: "18px",
                                borderColor: selected ? "hsl(var(--primary))" : "rgba(255,255,255,0.45)",
                                boxShadow: selected ? "0 0 8px rgba(234,184,46,0.40)" : "none",
                              }}
                            >
                              {selected && (
                                <span
                                  className="rounded-full bg-primary"
                                  style={{ width: "8px", height: "8px" }}
                                />
                              )}
                            </span>
                            <span
                              className="text-sm sm:text-base leading-[1.55] font-light transition-colors duration-300"
                              style={{ color: selected ? "hsl(var(--foreground))" : "rgba(255,255,255,0.80)" }}
                            >
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={submitting || !commitment}
                    onMouseMove={handleBtnMouseMove}
                    onMouseLeave={handleBtnMouseLeave}
                    style={{
                      x: btnSpringX,
                      y: btnSpringY,
                      boxShadow: commitment && !submitting ? "0 0 28px rgba(234,184,46,0.35), 0 0 6px rgba(234,184,46,0.20)" : "none",
                      transition: "box-shadow 0.4s ease",
                    }}
                    data-testid="button-submit-portfolio"
                    className="group relative w-full py-4 bg-transparent border border-primary overflow-hidden cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed rounded-sm"
                  >
                    <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <span className="relative z-10 text-primary group-hover:text-primary-foreground uppercase tracking-[0.3em] text-xs sm:text-[0.9rem] font-semibold transition-colors duration-500">
                      {submitting ? "Submitting…" : "Submit Portfolio For Review"}
                    </span>
                  </motion.button>

                  {submitError && (
                    <p className="mt-3 text-xs text-destructive/90 tracking-wide" data-testid="submit-error">
                      {submitError}
                    </p>
                  )}
                </motion.form>

                {/* Footer note */}
                <motion.p
                  variants={wordAnimation}
                  className="mt-4 sm:mt-5 text-[10px] sm:text-xs text-muted-foreground/35 font-light tracking-wider max-w-xs sm:max-w-sm text-center leading-relaxed"
                >
                  All submissions are reviewed personally by L.J. Vijay within 72 hours.
                </motion.p>
              </>
            )}
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-12 md:py-16 border-t border-border/40 overflow-hidden bg-[#020202]">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[25vw] font-serif italic text-border/8 select-none pointer-events-none tracking-tighter leading-none">
          MT
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between px-6 md:px-12 max-w-6xl mx-auto gap-4 text-foreground/55 text-xs uppercase tracking-widest">
          <div className="font-serif italic text-lg text-foreground/60 normal-case tracking-normal">Music Tutorship</div>
          <div>&copy; {new Date().getFullYear()} All Rights Reserved.</div>
        </div>
      </footer>
    </div>
  );
}
