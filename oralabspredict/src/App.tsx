import { AnimatedTopDock } from "./shaders/animated-top-dock/AnimatedTopDock"
import { LiquidButton, MetalButton } from "./components/ui/liquid-glass-button"
import { ArrowRight, Sparkles } from "lucide-react"
import "./shaders/threeui.css"
import './App.css'

function App() {
  return (
    <div className="app-container relative">
      <div className="shader-frame absolute top-0 left-0 w-full z-50">
        <AnimatedTopDock
          variant="modern"
          proximity={122}
          spring={0.19}
          damping={0.70}
          widthGrowth={17}
          heightGrowth={16}
          drop={3.5}
        />
      </div>

      <main className="hero-section flex-col flex items-center justify-center min-h-screen pt-24">
        <div className="max-w-4xl px-4 text-center">
          <h1 className="hero-title">
            Prediction Redefined
          </h1>
          <p className="hero-subtitle mx-auto">
            Experience our new liquid glass components, designed with precision and tailored for maximum aesthetics. Dive into the modern web.
          </p>

          <div className="button-group mt-8">
            <LiquidButton size="lg" className="text-white">
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started
            </LiquidButton>

            <MetalButton variant="primary">
              <span className="flex items-center">
                Explore Documentation
                <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </MetalButton>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
