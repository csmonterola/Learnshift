import React, { useEffect, useState } from 'react'
import { Activity, BrainCircuit, CheckCircle2, ChevronRight } from 'lucide-react'

export function StudentDiagnostic() {
  const [step, setStep] = useState<'intro' | 'test' | 'analyzing' | 'results'>('intro')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (step === 'analyzing') {
      const interval = setInterval(() => {
        setProgress((prev: number) => {
          if (prev >= 100) {
            clearInterval(interval)
            setTimeout(() => setStep('results'), 500)
            return 100
          }
          return prev + 2
        })
      }, 50)
      return () => clearInterval(interval)
    }
  }, [step])

  return (
    <div className="max-w-3xl mx-auto py-8">
      {step === 'intro' && (
        <div className="text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-24 h-24 bg-accent-100 rounded-full flex items-center justify-center mx-auto">
            <Activity className="w-12 h-12 text-accent-600" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">AI Diagnostic Assessment</h1>
            <p className="text-xl text-slate-600 max-w-xl mx-auto">
              Let's figure out exactly where you are. We'll ask a few questions to build your personalized AI Study Plan.
            </p>
          </div>
          <button
            onClick={() => setStep('test')}
            className="bg-accent-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-accent-600 transition-colors shadow-lg shadow-accent-500/25"
          >
            Start Diagnostic
          </button>
        </div>
      )}

      {step === 'test' && (
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-8">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Question 1 of 15</span>
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent-500" style={{ width: '6.67%' }}></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            How comfortable are you with solving quadratic equations using the quadratic formula?
          </h2>
          <div className="space-y-3">
            {['Very comfortable', 'Somewhat comfortable', 'I need a refresher', 'I have never learned this'].map((opt, i) => (
              <button
                key={i}
                onClick={() => setStep('analyzing')}
                className="w-full text-left p-5 rounded-xl border-2 border-slate-200 hover:border-accent-500 hover:bg-accent-50 transition-all font-medium text-slate-700 hover:text-accent-900"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="text-center space-y-8 py-12 animate-in fade-in duration-500">
          <div className="relative w-32 h-32 mx-auto">
            <svg className="animate-spin w-full h-full text-accent-200" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <BrainCircuit className="w-12 h-12 text-accent-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your responses...</h2>
            <p className="text-slate-500">LearnShift AI is building your custom study plan.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-accent-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="text-sm font-bold text-accent-600 mt-2">{progress}%</p>
          </div>
        </div>
      )}

      {step === 'results' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Your Study Plan is Ready!</h2>
            <p className="text-slate-600">Based on your diagnostic, we've tailored your curriculum.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-accent-500" />
              AI Recommendations
            </h3>
            <div className="space-y-6">
              {[
                { num: '1', bg: 'bg-blue-100', text: 'text-blue-600', title: 'Review: Linear Equations', desc: 'We noticed some hesitation here. A quick 15-minute refresher will build a strong foundation.' },
                { num: '2', bg: 'bg-accent-100', text: 'text-accent-600', title: 'Focus: Quadratic Formula', desc: "This is your primary learning target for the week. We've unlocked the relevant modules." },
                { num: '3', bg: 'bg-green-100', text: 'text-green-600', title: 'Skip: Basic Arithmetic', desc: "You've mastered this! We've automatically marked these modules as complete." },
              ].map((item) => (
                <div key={item.num} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-full ${item.bg} flex items-center justify-center shrink-0 ${item.text} font-bold`}>
                    {item.num}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                    <p className="text-slate-600 mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-8 border-t border-slate-100 flex justify-center">
              <button className="bg-accent-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-accent-600 transition-colors shadow-lg shadow-accent-500/25 flex items-center gap-2">
                Go to My Dashboard <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
