import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({ lectures: 0, students: 0, rating: 0, satisfaction: 0 });
  const [isVisible, setIsVisible] = useState(false);

  // Memoized random values for stable animations
  const particleData = useMemo(() => {
    return Array.from({length: 25}, (_, i) => ({
      width: 2 + Math.random() * 4,
      height: 2 + Math.random() * 4,
      left: Math.random() * 100,
      animationDuration: 10 + Math.random() * 15,
      animationDelay: Math.random() * 20,
      background: `rgba(${Math.random() > 0.5 ? 0 : 170}, ${255 - Math.random() * 200}, 136, ${0.1 + Math.random() * 0.3})`
    }));
  }, []);

  const cubeData = useMemo(() => {
    return Array.from({length: 8}, (_, i) => ({
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 80,
      animationDelay: Math.random() * 10
    }));
  }, []);

  const orbitalData = useMemo(() => {
    return Array.from({length: 6}, (_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDuration: 8 + Math.random() * 8,
      animationDelay: Math.random() * 8
    }));
  }, []);

  const helixData = useMemo(() => {
    return Array.from({length: 5}, (_, i) => ({
      left: Math.random() * 100,
      animationDelay: Math.random() * 14
    }));
  }, []);

  const matrixData = useMemo(() => {
    return Array.from({length: 12}, (_, i) => ({
      left: Math.random() * 100,
      animationDelay: Math.random() * 15,
      characters: Array.from({length: 20}, () => Math.random().toString(36)[0].toUpperCase())
    }));
  }, []);

  const waveData = useMemo(() => {
    return Array.from({length: 4}, (_, i) => ({
      left: 10 + Math.random() * 80,
      top: 10 + Math.random() * 80,
      animationDelay: Math.random() * 8
    }));
  }, []);

  const streamData = useMemo(() => {
    return Array.from({length: 8}, (_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 10
    }));
  }, []);

  const circleData = useMemo(() => {
    return Array.from({length: 6}, (_, i) => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      animationDelay: Math.random() * 6
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);

    const interval = setInterval(() => {
      setStats(prev => ({
        lectures: prev.lectures < 30 ? prev.lectures + 1 : 30,
        students: prev.students < 50000 ? prev.students + 500 : 50000,
        rating: prev.rating < 4.9 ? Math.min(prev.rating + 0.05, 4.9) : 4.9,
        satisfaction: prev.satisfaction < 100 ? prev.satisfaction + 2 : 100
      }));
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a1121',
      color: '#e0e0e0',
      fontFamily: "'Roboto', sans-serif",
      overflowX: 'hidden',
      position: 'relative'
    }}>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;600;700;900&family=Roboto:wght@300;400;500;700&display=swap');
          
          .home-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .hero-section {
            text-align: center;
            padding: 80px 20px;
            position: relative;
          }
          
          .hero-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 3.5rem;
            color: white;
            margin-bottom: 20px;
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.8);
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% { text-shadow: 0 0 20px rgba(0, 255, 136, 0.8); }
            50% { text-shadow: 0 0 30px rgba(0, 255, 136, 1), 0 0 40px rgba(0, 255, 136, 0.6); }
            100% { text-shadow: 0 0 20px rgba(0, 255, 136, 0.8); }
          }
          
          .hero-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.5rem;
            color: #00aaff;
            margin-bottom: 40px;
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
            line-height: 1.6;
          }
          
          .hero-button {
            background: #00ff88;
            color: #0a1121;
            border: none;
            border-radius: 4px;
            padding: 16px 40px;
            font-family: 'Orbitron', sans-serif;
            font-weight: bold;
            font-size: 1.3rem;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 0 25px rgba(0, 255, 136, 0.5);
          }
          
          .hero-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 35px rgba(0, 255, 136, 0.8);
            transform: translateY(-5px);
          }
          
          .features-section {
            padding: 60px 20px;
            text-align: center;
          }
          
          .section-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: #00ff88;
            margin-bottom: 50px;
          }
          
          .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
            margin-top: 30px;
          }
          
          .feature-card {
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: all 0.4s ease;
          }
          
          .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 136, 0.2);
            border-color: #00ff88;
          }
          
          .feature-icon {
            font-size: 3rem;
            color: #00ff88;
            margin-bottom: 20px;
          }
          
          .feature-title {
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
            font-size: 1.5rem;
            margin-bottom: 15px;
          }
          
          .feature-description {
            font-family: 'Roboto', sans-serif;
            color: #aaaaaa;
            line-height: 1.7;
          }
          
          .cta-section {
            text-align: center;
            padding: 80px 20px;
            background: rgba(0, 20, 40, 0.6);
            border-radius: 20px;
            margin: 60px 0;
            border: 1px solid #2a4060;
          }
          
          .cta-title {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: #00ff88;
            margin-bottom: 20px;
          }
          
          .cta-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.2rem;
            color: #00aaff;
            max-width: 700px;
            margin: 0 auto 40px;
            line-height: 1.6;
          }
          
          .stats-section {
            padding: 60px 20px;
            text-align: center;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            margin-top: 40px;
          }
          
          .stat-card {
            background: rgba(0, 255, 136, 0.1);
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 12px;
            padding: 30px 20px;
          }
          
          .stat-number {
            font-family: 'Orbitron', sans-serif;
            font-size: 2.5rem;
            color: #00ff88;
            margin-bottom: 10px;
          }
          
          .stat-label {
            font-family: 'Roboto', sans-serif;
            color: #aaaaaa;
          }

          /* 3D Animations and Effects */
          .floating-shape {
            position: absolute;
            z-index: -1;
            animation: float 6s ease-in-out infinite;
          }

          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }

          .floating-geometric {
            position: absolute;
            width: 50px;
            height: 50px;
            background: linear-gradient(45deg, rgba(0, 255, 136, 0.3), rgba(0, 170, 255, 0.3));
            border-radius: 25% 75% 75% 25% / 25% 75% 25% 75%;
            animation: floatGeometric 8s ease-in-out infinite;
            z-index: -1;
          }

          @keyframes floatGeometric {
            0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            33% { transform: translateY(-30px) translateX(20px) rotate(120deg); }
            66% { transform: translateY(-10px) translateX(-15px) rotate(240deg); }
          }

          .testimonials-section {
            padding: 80px 20px;
            text-align: center;
            position: relative;
          }

          .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 40px;
            margin-top: 50px;
          }

          .testimonial-card {
            background: #111c30;
            border: 1px solid #2a4060;
            border-radius: 20px;
            padding: 40px;
            transition: all 0.6s ease;
            position: relative;
            overflow: hidden;
          }

          .testimonial-card::before {
            content: '"';
            position: absolute;
            top: 20px;
            left: 30px;
            font-size: 4rem;
            color: rgba(0, 255, 136, 0.3);
            font-family: 'Georgia', serif;
          }

          .testimonial-card:hover {
            transform: rotateX(5deg) rotateY(-5deg) translateY(-10px);
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 136, 0.3);
            border-color: #00ff88;
          }

          .testimonial-content {
            font-family: 'Roboto', sans-serif;
            font-style: italic;
            color: #e0e0e0;
            margin-bottom: 30px;
            line-height: 1.6;
            position: relative;
          }

          .testimonial-author {
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
            font-weight: bold;
          }

          .testimonial-role {
            font-family: 'Roboto', sans-serif;
            color: #00aaff;
            font-size: 0.9rem;
            margin-top: 5px;
          }

          .instructors-section {
            padding: 80px 20px;
            text-align: center;
            background: linear-gradient(135deg, rgba(0, 20, 40, 0.8), rgba(10, 17, 33, 0.8));
          }

          .instructors-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 30px;
            margin-top: 50px;
          }

          .instructor-card {
            background: #0a1121;
            border: 1px solid #2a4060;
            border-radius: 16px;
            padding: 30px;
            transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }

          .instructor-card:hover {
            transform: scale(1.05) rotate(-2deg);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4), 0 0 50px rgba(0, 255, 136, 0.3);
            border-color: #00ff88;
          }

          .instructor-image {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: linear-gradient(45deg, #00ff88, #00aaff);
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
          }

          .instructor-name {
            font-family: 'Orbitron', sans-serif;
            color: #00ff88;
            font-weight: bold;
            margin-bottom: 10px;
          }

          .instructor-title {
            font-family: 'Roboto', sans-serif;
            color: #e0e0e0;
            margin-bottom: 15px;
          }

          .instructor-description {
            font-family: 'Roboto', sans-serif;
            color: #aaaaaa;
            line-height: 1.6;
            font-size: 0.9rem;
          }

          .feature-card:hover {
            transform: translateY(-10px) rotateY(15deg);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 136, 0.2);
            border-color: #00ff88;
          }

          .hero-button:hover {
            background: #00cc6d;
            box-shadow: 0 0 35px rgba(0, 255, 136, 0.8);
            transform: translateY(-5px) scale(1.05);
          }

          .stat-card:hover {
            transform: scale(1.1);
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
            border-color: #00ff88;
          }

          .footer-section {
            text-align: center;
            padding: 40px 20px;
            background: #060911;
            color: #aaaaaa;
            border-top: 1px solid #2a4060;
          }

          .footer-content {
            max-width: 600px;
            margin: 0 auto;
          }

          .footer-text {
            font-family: 'Roboto', sans-serif;
            margin-bottom: 20px;
            line-height: 1.6;
          }

          .footer-links {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
          }

          .footer-link {
            color: #00aaff;
            text-decoration: none;
            font-family: 'Orbitron', sans-serif;
            font-size: 0.9rem;
            transition: all 0.3s ease;
          }

          .footer-link:hover {
            color: #00ff88;
            transform: translateY(-3px);
          }

          .copyright {
            font-size: 0.8rem;
            color: #777;
          }

          /* Enhanced 3D Background Animations - Professional & Visible */
          .particle {
            position: absolute;
            border-radius: 50%;
            pointer-events: none;
            z-index: -2;
            animation: drift 15s infinite linear;
            border: 2px solid rgba(0, 255, 136, 0.8);
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
          }

          @keyframes drift {
            0% { transform: translateY(100vh) translateX(0px) rotate(0deg); opacity: 0.7; }
            25% { opacity: 1; }
            50% { transform: translateY(50vh) translateX(50px) rotate(45deg); opacity: 0.8; }
            75% { opacity: 0.6; }
            100% { transform: translateY(-100px) translateX(100px) rotate(180deg); opacity: 0; }
          }

          .cube3d {
            position: absolute;
            width: 40px;
            height: 40px;
            background: linear-gradient(45deg, rgba(0, 255, 136, 0.4), rgba(0, 170, 255, 0.4));
            border: 2px solid rgba(0, 255, 136, 0.6);
            animation: cubeRotate 10s infinite ease-in-out;
            z-index: -1;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.7);
          }

          @keyframes cubeRotate {
            0% { transform: rotateX(0deg) rotateY(0deg) scale(1); opacity: 0.8; }
            25% { transform: rotateX(90deg) rotateY(90deg) scale(1.1); opacity: 1; }
            50% { transform: rotateX(180deg) rotateY(180deg) scale(0.9); opacity: 0.5; }
            75% { transform: rotateX(270deg) rotateY(270deg) scale(1.1); opacity: 0.8; }
            100% { transform: rotateX(360deg) rotateY(360deg) scale(1); opacity: 0.8; }
          }

          .orbital {
            position: absolute;
            width: 60px;
            height: 60px;
            border: 3px solid rgba(0, 255, 136, 0.6);
            border-radius: 50%;
            border-top: 3px solid transparent;
            animation: orbit 12s infinite linear;
            z-index: -1;
            box-shadow: inset 0 0 20px rgba(0, 255, 136, 0.3);
          }

          .orbital::after {
            content: '';
            position: absolute;
            top: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 6px;
            height: 6px;
            background: #00ff88;
            border-radius: 50%;
            animation: orbPulse 1.5s infinite;
            box-shadow: 0 0 15px #00ff88;
          }

          @keyframes orbit {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          @keyframes orbPulse {
            0%, 100% { box-shadow: 0 0 10px rgba(0, 255, 136, 0.5); }
            50% { box-shadow: 0 0 20px rgba(0, 255, 136, 1); }
          }

          .helix {
            position: absolute;
            width: 80px;
            height: 100px;
            background: linear-gradient(225deg, transparent, rgba(0, 170, 255, 0.1), transparent);
            animation: helixFlow 14s infinite ease-in-out;
            z-index: -2;
          }

          @keyframes helixFlow {
            0%, 100% { transform: translateY(100vh) rotateX(0deg) rotateY(0deg); }
            50% { transform: translateY(-50vh) rotateX(180deg) rotateY(360deg); }
          }

          .grid-pattern {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image:
              linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
            background-size: 50px 50px;
            z-index: -3;
          }

          .matrix-rain {
            position: absolute;
            font-family: 'Orbitron', monospace;
            color: rgba(0, 255, 136, 0.1);
            font-size: 14px;
            white-space: nowrap;
            animation: matrixFall 15s infinite linear, fadeMatrix 5s infinite alternate;
            z-index: -2;
          }

          @keyframes matrixFall {
            0% { transform: translateY(-100px); }
            100% { transform: translateY(120vh); }
          }

          @keyframes fadeMatrix {
            0%, 100% { opacity: 0.1; }
            50% { opacity: 0.3; }
          }

          .energy-wave {
            position: absolute;
            width: 200px;
            height: 200px;
            border: 2px solid rgba(0, 255, 136, 0.6);
            border-radius: 50%;
            animation: waveExpand 8s infinite ease-out;
            z-index: -1;
            box-shadow: inset 0 0 30px rgba(0, 255, 136, 0.4);
          }

          @keyframes waveExpand {
            0% { transform: scale(0) rotate(0deg); opacity: 1; }
            50% { opacity: 0.7; }
            100% { transform: scale(3) rotate(360deg); opacity: 0; }
          }

          .data-stream {
            position: absolute;
            width: 4px;
            height: 150px;
            background: linear-gradient(180deg, rgba(0, 255, 136, 0.8), rgba(0, 170, 255, 0.8), rgba(0, 255, 136, 0.8));
            border-radius: 2px;
            animation: streamFlow 10s infinite alternate-reverse;
            z-index: -1;
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
          }

          @keyframes streamFlow {
            0% { height: 30px; opacity: 0.8; }
            50% { height: 200px; opacity: 1; }
            100% { height: 30px; opacity: 0.8; }
          }

          .polyhedron {
            position: absolute;
            width: 30px;
            height: 30px;
            background: rgba(0, 170, 255, 0.2);
            clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
            animation: polySpin 16s infinite linear;
            z-index: -2;
          }

          @keyframes polySpin {
            0% { transform: rotateX(0deg) rotateY(0deg); }
            100% { transform: rotateX(360deg) rotateY(360deg); }
          }

          /* Responsive particle generation */
          @media (min-width: 768px) {
            .particle:nth-child(2n) { animation-delay: -2s; }
            .particle:nth-child(3n) { animation-delay: -4s; }
            .particle:nth-child(4n) { animation-delay: -6s; }
          }

          .pulse-circle {
            position: absolute;
            border: 1px solid rgba(0, 255, 136, 0.3);
            border-radius: 50%;
            animation: pulseGrow 6s infinite;
            z-index: -2;
          }

          @keyframes pulseGrow {
            0% { transform: scale(0.1); opacity: 0.8; }
            50% { opacity: 0.4; }
            100% { transform: scale(2); opacity: 0; }
          }

          .cyber-grid {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -4;
          }

          .cyber-grid::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background:
              linear-gradient(to right, rgba(0, 255, 136, 0.02) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(0, 255, 136, 0.02) 1px, transparent 1px);
            background-size: 40px 40px;
            animation: gridMove 20s infinite linear;
          }

          @keyframes gridMove {
            0% { background-position: 0 0; }
            100% { background-position: 40px 40px; }
          }

          /* Custom bright animations for maximum visibility */
          .cube3d {
            position: absolute;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 0, 0.7);
            border: 2px solid #ff0000;
            animation: cubeAnimate 8s infinite ease-in-out;
            z-index: 2;
          }

          @keyframes cubeAnimate {
            0% { transform: rotateX(0deg) rotateY(0deg) scale(1); border-color: #ff0000; }
            25% { transform: rotateX(90deg) rotateY(90deg) scale(1.2); border-color: #00ff88; }
            50% { transform: rotateX(180deg) rotateY(180deg) scale(0.8); border-color: #ff69b4; }
            75% { transform: rotateX(270deg) rotateY(270deg) scale(1.2); border-color: #ffff00; }
            100% { transform: rotateX(360deg) rotateY(360deg) scale(1); border-color: #ff0000; }
          }

          .orbital {
            position: absolute;
            border: 4px solid #ff69b4;
            border-radius: 50%;
            border-top: 4px solid transparent;
            animation: orbitSpin 10s infinite linear;
            z-index: 2;
          }

          @keyframes orbitSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Enhanced 3D Background Elements */}
      <div className="grid-pattern"></div>
      <div className="cyber-grid"></div>

      {/* Enhanced 3D Background Elements - HIGHLY VISIBLE VERSION */}
      <div className="grid-pattern"></div>
      <div className="cyber-grid"></div>

      {/* Massive Visible Particles */}
      {particleData.map((particle, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${particle.left}%`,
            width: `${Math.max(particle.width * 3, 10)}px`,
            height: `${Math.max(particle.height * 3, 10)}px`,
            background: 'rgba(0, 255, 136, 0.9)',
            animationDuration: `${particle.animationDuration}s`,
            animationDelay: `${particle.animationDelay}s`,
            zIndex: 1,
            border: '1px solid #00ff88'
          }}
        ></div>
      ))}


    

      {/* Helix Elements */}
      {helixData.map((helix, i) => (
        <div
          key={i + 45}
          className="helix"
          style={{
            left: `${helix.left}%`,
            animationDelay: `${helix.animationDelay}s`,
          }}
        ></div>
      ))}

      {/* Matrix Rain */}
      {matrixData.map((matrix, i) => (
        <div
          key={i + 50}
          className="matrix-rain"
          style={{
            left: `${matrix.left}%`,
            animationDelay: `${matrix.animationDelay}s`,
          }}
        >
          {matrix.characters.map((char, j) => (
            <span key={j} style={{color: Math.random() > 0.7 ? '#ff6b6b' : 'inherit'}}>
              {char}
            </span>
          ))}
        </div>
      ))}

      {/* Energy Waves */}
      {waveData.map((wave, i) => (
        <div
          key={i + 65}
          className="energy-wave"
          style={{
            left: `${wave.left}%`,
            top: `${wave.top}%`,
            animationDelay: `${wave.animationDelay}s`,
          }}
        ></div>
      ))}

      {/* Data Streams */}
      {streamData.map((stream, i) => (
        <div
          key={i + 70}
          className="data-stream"
          style={{
            left: `${stream.left}%`,
            top: `${stream.top}%`,
            animationDelay: `${stream.animationDelay}s`,
          }}
        ></div>
      ))}

   
      
      <div className="home-container">
        <div className="hero-section">
         
          <h1 className="hero-title">AIShield <span style={{color: '#00ff88'}}>India</span></h1>
          <p className="hero-subtitle">
           Master penetration testing from web apps to AI systems — a complete journey from beginner to advanced ethical hacker.

Learn from certified experts, OSCP professionals, and AI security researchers with real-world experience defending Fortune 500 companies and uncovering global vulnerabilities.

</p>
          <button
            className="hero-button"
            onClick={handleGetStarted}
          >
            Get Started
          </button>
        </div>
        
        <div className="features-section">
          <h2 className="section-title">Course Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3 className="feature-title">Comprehensive Content</h3>
              <p className="feature-description">
              🔹 Web App Pentesting: SQLi, XSS, CSRF, IDOR, SSRF, and business logic exploits<br></br>
              🔹 Network & Infrastructure: Internal pivoting, Active Directory attacks, firewall evasion<br></br> 
              🔹 API Testing: REST, GraphQL, JWT manipulation, authentication bypass<br></br>
              🔹 AI/ML Penetration Testing: Prompt injection, model poisoning, LLM jailbreaking, data leakage<br></br>
              🔹 Red Teaming & Post-Exploitation: Privilege escalation, lateral movement, C2 frameworks<br></br> 
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💻</div>
              <h3 className="feature-title">Hands-On Labs</h3>
              <p className="feature-description">
                Interactive demos and practical exercises to reinforce learning. 
                Try exploitation techniques in a safe, controlled environment.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">Expert Instruction</h3>
              <p className="feature-description">
                Learn from HTB Elite Hacker and Senior Security Engineer with 
                real-world experience in penetration testing and vulnerability assessment.
              </p>
            </div>
          </div>
        </div>
        
        <div className="cta-section">
          <h2 className="cta-title">Ready to Master Penetration Testing?</h2>
          <p className="cta-subtitle">
            Join thousands of security professionals who have enhanced their skills with our course. 
            Get lifetime access to all materials for a one-time payment.
          </p>
          <button 
            className="hero-button"
            onClick={handleGetStarted}
          >
            Enroll Now - ₹1999
          </button>
        </div>
        
        <div className="stats-section">
          <h2 className="section-title">Course Impact</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{Math.floor(stats.lectures)}+ </div>
              <div className="stat-label">Comprehensive Lectures</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{Math.floor(stats.students/1000)}K+ </div>
              <div className="stat-label">Students Taught</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.rating.toFixed(1)}/5</div>
              <div className="stat-label">Average Rating</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{Math.floor(stats.satisfaction)}%</div>
              <div className="stat-label">Satisfaction Guarantee</div>
            </div>
          </div>
        </div>

        <div className="testimonials-section">
          <h2 className="section-title">Student Reviews</h2>
          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-content">
                This course transformed my understanding of cybersecurity. The AI penetration testing module was particularly enlightening, showing real-world applications that I could immediately apply in my job.
              </div>
              <div className="testimonial-author">Rahul Sharma</div>
              <div className="testimonial-role">Security Analyst at Infosys</div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                The hands-on approach with practical labs made complex concepts accessible. I went from viewing pentesting as mysterious to confidently conducting assessments for my organization.
              </div>
              <div className="testimonial-author">Priya Patel</div>
              <div className="testimonial-role">IT Security Consultant</div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-content">
                AIShield India's OSCP-aligned curriculum gave me the skills I needed to pass the exam on my first attempt. The expert instruction and real-world scenarios were invaluable.
              </div>
              <div className="testimonial-author">Amit Kumar</div>
              <div className="testimonial-role">Certified Ethical Hacker</div>
            </div>
          </div>
        </div>

        <div className="instructors-section">
          <h2 className="section-title">Expert Instructors</h2>
          <div className="instructors-grid">
            <div className="instructor-card">
              <div className="instructor-image">👨‍💻</div>
              <div className="instructor-name">Ankush Rana</div>
              <div className="instructor-title">Lead Instructor</div>
              <div className="instructor-description">
                OSCP certified with 4+ years experience. Former security engineer at major Fortune 200+ companies, specializing in red teaming and AI security research.
              </div>
            </div>

            <div className="instructor-card">
              <div className="instructor-image">👩‍🔬</div>
              <div className="instructor-name">Dr. Aisha Rahman</div>
              <div className="instructor-title">AI Security Expert</div>
              <div className="instructor-description">
                PhD in Machine Learning Security. World-renowned researcher in AI/ML vulnerabilities and has published groundbreaking papers on LLM security.
              </div>
            </div>

            <div className="instructor-card">
              <div className="instructor-image">🛡️</div>
              <div className="instructor-name">Vikram Singh</div>
              <div className="instructor-title">Cybersecurity Consultant</div>
              <div className="instructor-description">
                HTB Elite Hacker with specialization in advanced persistent threats. Consults for government agencies and successfully uncovered zero-day vulnerabilities.
              </div>
            </div>
          </div>
        </div>

        <div className="footer-section">
          <div className="footer-content">
            <p className="footer-text">
              Elevate your cybersecurity career with AIShield India. Join our global community of ethical hackers and security professionals.
            </p>
            <div className="footer-links">
              <a href="#" className="footer-link">Contact Us</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
            <div className="copyright">
              © 2025 AIShield India. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
