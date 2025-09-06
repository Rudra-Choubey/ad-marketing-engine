"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Sparkles, Target, DollarSign, MapPin, Megaphone, Users, Globe, Wand2 } from "lucide-react"

interface MarketingData {
  product: string
  price: string
  place: string
  promotion: string
  people: string
  localize: boolean
}

export default function MarketingAutomationApp() {
  const [formData, setFormData] = useState<MarketingData>({
    product: "",
    price: "",
    place: "",
    promotion: "",
    people: "",
    localize: false,
  })

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [creative, setCreative] = useState<any>(null)

  const handleInputChange = (field: keyof MarketingData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    console.log("📤 Sending data to backend:", formData)
    setIsLoading(true)
    setError("")
    setCreative(null)

    try {
      const response = await fetch("http://127.0.0.1:8000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_name: formData.product,
          target_audience: formData.people,
          localize: formData.localize,
        }),
      })

      console.log("📥 Got response:", response.status)

      if (!response.ok) throw new Error("Failed to generate creative.")

      const data = await response.json()
      console.log("✅ Parsed creative:", data)
      setCreative(data)
    } catch (err: any) {
      console.error("❌ Error:", err)
      setError(err.message || "Something went wrong.")
    } finally {
      setIsLoading(false)
    }
  }

  const marketingPs = [
    {
      key: "product",
      label: "Product",
      icon: Sparkles,
      placeholder: "e.g., Revolutionary AI-Powered Fitness App, Premium Organic Coffee Experience",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      key: "price",
      label: "Price",
      icon: DollarSign,
      placeholder: "e.g., Premium tier at $49/month, Luxury positioning at $299",
      gradient: "from-emerald-500 to-teal-500",
    },
    {
      key: "place",
      label: "Place",
      icon: MapPin,
      placeholder: "e.g., Exclusive online marketplace, Premium retail locations in major cities",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      key: "promotion",
      label: "Promotion",
      icon: Megaphone,
      placeholder: "e.g., Influencer-driven social campaign, Exclusive launch events",
      gradient: "from-orange-500 to-red-500",
    },
    {
      key: "people",
      label: "People",
      icon: Users,
      placeholder: "e.g., Tech-savvy millennials with disposable income, C-suite executives",
      gradient: "from-indigo-500 to-purple-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-purple-200/30 to-pink-200/30 rounded-full blur-3xl animate-float"></div>
        <div
          className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-cyan-200/30 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-r from-emerald-200/20 to-teal-200/20 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "4s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900">AI Marketing Creative Generator</h1>
            </div>
            <p className="text-gray-600 text-lg">Generate compelling marketing creatives using the 5 Ps framework</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-gray-200 shadow-xl">
            <CardHeader className="pb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-gray-900">Marketing Strategy Input</CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Define your marketing strategy using the 5 Ps framework
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Inputs */}
                <div className="grid gap-6">
                  {marketingPs.map(({ key, label, icon: Icon, placeholder, gradient }) => (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 bg-gradient-to-r ${gradient} rounded-lg flex items-center justify-center shadow-md`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <Label htmlFor={key} className="text-lg font-semibold text-gray-900">
                          {label}
                        </Label>
                      </div>
                      <Textarea
                        id={key}
                        placeholder={placeholder}
                        value={formData[key as keyof MarketingData] as string}
                        onChange={(e) => handleInputChange(key as keyof MarketingData, e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500 min-h-[80px] resize-none text-base leading-relaxed focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all duration-300"
                        required
                      />
                    </div>
                  ))}
                </div>

                <Separator className="bg-gray-200" />

                {/* Localization toggle */}
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <Label htmlFor="localize" className="text-lg font-semibold text-gray-900">
                          Enable Localization
                        </Label>
                        <p className="text-gray-600 text-sm mt-1">
                          Adapt content for regional preferences and cultural nuances
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="localize"
                      checked={formData.localize}
                      onCheckedChange={(checked) => handleInputChange("localize", checked)}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-4">
                  <div
                    onClick={handleSubmit}
                    className="w-full h-14 text-lg font-bold text-white cursor-pointer rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #7c3aed 0%, #be185d 100%)",
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                  >
                    {isLoading ? (
                      "Generating..."
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5 mr-2" />
                        Generate Creatives
                      </>
                    )}
                  </div>
                </div>

                {/* Error / Result */}
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {creative && (
                  <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="text-xl font-semibold mb-4">Generated Creatives</h3>
                    <p className="mb-2 text-gray-700">{creative.creative_brief}</p>
                    <p className="mb-6 text-gray-500 text-sm">
                      Performance Score: {creative.performance_score}
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                      {creative.creatives?.map((c: any) => (
                        <Card key={c.id} className="overflow-hidden shadow-md">
                          <CardContent className="p-4">
                            <h4 className="font-bold text-lg">{c.headline}</h4>
                            <p className="text-gray-700">{c.primary_text}</p>
                            {c.image_url && (
                              <img
                                src={c.image_url}
                                alt={c.headline}
                                className="rounded-lg mt-3 w-full h-48 object-cover"
                              />
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                              Brand Score: {c.scores.brand}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
