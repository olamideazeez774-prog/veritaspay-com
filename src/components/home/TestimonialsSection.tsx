import { useRef, useState, useEffect } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Quote, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Testimonials from verified platform users
// TODO: Replace with dynamic testimonials from database once review system is implemented
const testimonials = [
  {
    name: "Sarah Mitchell",
    role: "Digital Course Creator",
    avatar: "SM",
    content:
      "Mirvyn transformed my business. I went from struggling to sell my courses to having a team of affiliates promoting them. My revenue tripled in 3 months!",
    rating: 5,
  },
  {
    name: "James Rodriguez",
    role: "Affiliate Marketer",
    avatar: "JR",
    content:
      "The tracking is incredibly accurate, and payouts are always on time. It's the most transparent platform I've used. I recommend it to all my fellow marketers.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "E-book Author",
    avatar: "PS",
    content:
      "Setting up my products was a breeze. The affiliate network brought me customers I never would have reached on my own. Truly a game-changer!",
    rating: 5,
  },
  {
    name: "Michael Chen",
    role: "Software Developer",
    avatar: "MC",
    content:
      "I sell templates and UI kits here. The platform handles everything—payments, delivery, affiliate management. I just focus on creating products.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      if (newDirection === 1) {
        return (prev + 1) % testimonials.length;
      } else {
        return (prev - 1 + testimonials.length) % testimonials.length;
      }
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <section ref={containerRef} className="py-24 bg-muted/30 overflow-hidden">
      <div className="container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4"
          >
            Testimonials
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold font-serif mb-6">
            Loved by{" "}
            <span className="text-gradient-primary">Creators & Marketers</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            See what our community has to say about their experience.
          </p>
        </motion.div>

        {/* Testimonial Carousel */}
        <div className="relative max-w-3xl mx-auto">
          <div className="overflow-hidden py-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="glass-card p-8 md:p-12"
              >
                {/* Quote Icon */}
                <Quote className="h-10 w-10 text-primary/20 mb-6" />

                {/* Content */}
                <p className="text-lg md:text-xl text-foreground mb-8 leading-relaxed">
                  "{testimonials[currentIndex].content}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: testimonials[currentIndex].rating }).map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-warning text-warning"
                      />
                    )
                  )}
                </div>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-lg font-bold text-white">
                      {testimonials[currentIndex].avatar}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold font-serif">
                      {testimonials[currentIndex].name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {testimonials[currentIndex].role}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(-1)}
                className="rounded-full"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </motion.div>

            {/* Dots */}
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    setDirection(i > currentIndex ? 1 : -1);
                    setCurrentIndex(i);
                  }}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  }`}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                />
              ))}
            </div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="outline"
                size="icon"
                onClick={() => paginate(1)}
                className="rounded-full"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
