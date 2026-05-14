import {
  Home, Building2, Sparkles, Bath, Sofa, ChefHat, Layers, Truck,
  ShieldCheck, Leaf, Clock, BadgeCheck, Heart, Wallet,
} from "lucide-react";

export const services = [
  { icon: Home, title: "Home Cleaning", desc: "Routine cleaning that keeps your home fresh, healthy, and welcoming." },
  { icon: Building2, title: "Office Cleaning", desc: "Spotless workspaces that boost productivity and team well-being." },
  { icon: Sparkles, title: "Deep Cleaning", desc: "Thorough top-to-bottom service for a like-new sparkle." },
  { icon: Bath, title: "Bathroom Cleaning", desc: "Sanitized, descaled, and shining — every tile and fixture." },
  { icon: Sofa, title: "Sofa Cleaning", desc: "Upholstery shampoo and steam to restore fabrics safely." },
  { icon: ChefHat, title: "Kitchen Cleaning", desc: "Degreased surfaces, polished appliances, fresh cabinetry." },
  { icon: Layers, title: "Carpet Cleaning", desc: "Hot-water extraction lifts deep dirt, allergens, and odors." },
  { icon: Truck, title: "Move-In / Move-Out", desc: "Get your full deposit back with our move cleaning checklist." },
];

export const features = [
  { icon: BadgeCheck, title: "Verified Professionals", desc: "Background-checked, trained, insured." },
  { icon: Wallet, title: "Affordable Pricing", desc: "Transparent rates, no hidden fees." },
  { icon: Leaf, title: "Eco-Friendly Products", desc: "Safe for kids, pets, and the planet." },
  { icon: Clock, title: "Same-Day Service", desc: "Book by 11 AM, sparkle by evening." },
  { icon: ShieldCheck, title: "Satisfaction Guarantee", desc: "Not happy? We'll re-clean for free." },
  { icon: Heart, title: "Loved by 1000+", desc: "4.9★ average from real customers." },
];

export const stats = [
  { value: 5000, suffix: "+", label: "Services Completed" },
  { value: 1200, suffix: "+", label: "Happy Clients" },
  { value: 50, suffix: "+", label: "Professional Staff" },
  { value: 4.9, suffix: "", label: "Customer Rating" },
];

export const plans = [
  {
    name: "Basic",
    price: 89,
    period: "/visit",
    desc: "Perfect for tidy upkeep of small homes & studios.",
    features: ["Up to 2 rooms", "Dust & vacuum", "Kitchen wipe-down", "Bathroom clean", "Trash removal"],
    popular: false,
  },
  {
    name: "Standard",
    price: 149,
    period: "/visit",
    desc: "Most-loved plan for families and busy professionals.",
    features: ["Up to 4 rooms", "Everything in Basic", "Mop all floors", "Appliance exteriors", "Linen change", "Eco-friendly products"],
    popular: true,
  },
  {
    name: "Premium",
    price: 229,
    period: "/visit",
    desc: "Top-to-bottom deep clean for a like-new sparkle.",
    features: ["Unlimited rooms", "Everything in Standard", "Inside oven & fridge", "Window interiors", "Baseboards & vents", "Priority scheduling"],
    popular: false,
  },
];

export const reviews = [
  { name: "Amelia Carter", role: "Homeowner", rating: 5, text: "Honestly the best cleaning service we've used. The team showed up on time, used eco-friendly products, and our home felt brand new." },
  { name: "Marcus Lee", role: "Office Manager", rating: 5, text: "KD Cleaning Technologies transformed our office. Our team feels happier walking in every morning. Worth every penny." },
  { name: "Priya Shah", role: "Airbnb Host", rating: 5, text: "Quick turnovers and consistent quality. My 5-star reviews started rolling in once I switched to KD Cleaning Technologies." },
  { name: "Daniel Ortiz", role: "Renter", rating: 5, text: "Got my full deposit back thanks to their move-out clean. Could not recommend more." },
  { name: "Sophie Müller", role: "New Mom", rating: 5, text: "Eco-friendly products that I trust around my baby. The team is kind and detail-oriented." },
  { name: "Jordan Rivers", role: "Founder", rating: 5, text: "From booking to clean-up, every touchpoint felt premium. Like the Apple of cleaning services." },
];

export const faqs = [
  { q: "Are your cleaners background-checked?", a: "Yes — every team member is vetted, trained, and fully insured before stepping into a client's space." },
  { q: "Do you bring your own supplies?", a: "Absolutely. We bring eco-friendly products and professional equipment at no extra cost." },
  { q: "What if I'm not satisfied?", a: "Our 100% satisfaction guarantee means we'll re-clean any area for free within 24 hours." },
  { q: "How do I reschedule?", a: "Manage your booking from the email confirmation or message us — free changes up to 12 hours before." },
  { q: "Do you offer recurring discounts?", a: "Yes, weekly and bi-weekly plans include up to 20% off our standard rates." },
];
