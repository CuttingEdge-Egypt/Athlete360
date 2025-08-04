import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Check, Coins, Star, Trophy, Zap } from "lucide-react";

export default function Subscribe() {
  const handlePurchase = async (amount: number) => {
    try {
      const response = await fetch('/api/purchase-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        window.location.href = '/';
      } else {
        console.error('Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-athlete-primary text-white">
      <Navigation />
      
      <div className="pt-20 pb-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold mb-4 text-white">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get tokens to unlock powerful athlete analysis features. 
              Each token gives you access to premium AI-powered insights.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
            {/* Starter Pack */}
            <Card className="bg-athlete-gray-800 border-gray-700 relative">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-athlete-gray-700 rounded-full w-fit">
                  <Coins className="text-athlete-warning" size={32} />
                </div>
                <CardTitle className="text-xl text-white">Starter Pack</CardTitle>
                <div className="text-3xl font-bold text-white">$15</div>
                <p className="text-gray-400">500 Tokens</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">500 analysis tokens</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Basic athlete profiles</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Export to PDF</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">30-day validity</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handlePurchase(15)}
                  data-testid="button-purchase-starter"
                  className="w-full bg-athlete-gray-700 hover:bg-athlete-gray-600 text-white"
                >
                  Get Started
                </Button>
              </CardContent>
            </Card>

            {/* Professional Pack */}
            <Card className="bg-athlete-gray-800 border-athlete-accent relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="bg-athlete-accent text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-athlete-accent/20 rounded-full w-fit">
                  <Trophy className="text-athlete-accent" size={32} />
                </div>
                <CardTitle className="text-xl text-white">Professional</CardTitle>
                <div className="text-3xl font-bold text-white">$25</div>
                <p className="text-gray-400">1,000 Tokens</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">1,000 analysis tokens</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">All analysis features</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Advanced insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Priority support</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Share & collaborate</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handlePurchase(25)}
                  data-testid="button-purchase-professional"
                  className="w-full bg-athlete-accent hover:bg-blue-600 text-white"
                >
                  Get Professional
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Pack */}
            <Card className="bg-athlete-gray-800 border-gray-700 relative">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 bg-athlete-gray-700 rounded-full w-fit">
                  <Zap className="text-yellow-400" size={32} />
                </div>
                <CardTitle className="text-xl text-white">Enterprise</CardTitle>
                <div className="text-3xl font-bold text-white">$50</div>
                <p className="text-gray-400">2,500 Tokens</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">2,500 analysis tokens</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Bulk athlete analysis</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Team insights</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">Custom reports</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <Check className="text-athlete-success" size={16} />
                    <span className="text-gray-300">API access</span>
                  </li>
                </ul>
                <Button 
                  onClick={() => handlePurchase(50)}
                  data-testid="button-purchase-enterprise"
                  className="w-full bg-athlete-gray-700 hover:bg-athlete-gray-600 text-white"
                >
                  Get Enterprise
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-white">
              What You Get With Tokens
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-4">📊</div>
                  <h3 className="font-semibold mb-2 text-white">Bio Analysis</h3>
                  <p className="text-sm text-gray-400">50 tokens</p>
                </CardContent>
              </Card>
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-4">🏆</div>
                  <h3 className="font-semibold mb-2 text-white">Rank History</h3>
                  <p className="text-sm text-gray-400">70 tokens</p>
                </CardContent>
              </Card>
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-4">💪</div>
                  <h3 className="font-semibold mb-2 text-white">Strengths/Weaknesses</h3>
                  <p className="text-sm text-gray-400">50 tokens each</p>
                </CardContent>
              </Card>
              <Card className="bg-athlete-gray-800 border-gray-700">
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-4">🎥</div>
                  <h3 className="font-semibold mb-2 text-white">Video Analysis</h3>
                  <p className="text-sm text-gray-400">120 tokens</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
