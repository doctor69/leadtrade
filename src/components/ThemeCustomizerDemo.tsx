import { useState } from 'react';
import { ThemeCustomizer } from '@/components/ui/ThemeCustomizer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Sparkles, Palette } from 'lucide-react';

export default function ThemeCustomizerDemo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">Theme Customizer Demo</h1>
          <p className="text-muted-foreground">
            This page demonstrates the enhanced theme customization capabilities of LeadTrade.
            Customize the appearance of the application to match your preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Theme Settings
              </CardTitle>
              <CardDescription>
                Customize the appearance of your trading interface
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsOpen(!isOpen)} 
                className="w-full flex items-center justify-center gap-2"
              >
                <Palette className="h-4 w-4" />
                {isOpen ? 'Hide Theme Customizer' : 'Open Theme Customizer'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Preview
              </CardTitle>
              <CardDescription>
                See how your theme changes affect UI components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="buttons" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="buttons">Buttons</TabsTrigger>
                  <TabsTrigger value="cards">Cards</TabsTrigger>
                  <TabsTrigger value="text">Typography</TabsTrigger>
                </TabsList>
                <TabsContent value="buttons" className="space-y-4 pt-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                  </div>
                </TabsContent>
                <TabsContent value="cards" className="pt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Card Title</CardTitle>
                      <CardDescription>Card description goes here</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p>This is a sample card with content.</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm">Cancel</Button>
                      <Button size="sm" className="ml-2">Submit</Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                <TabsContent value="text" className="space-y-4 pt-4">
                  <h1 className="text-4xl font-bold">Heading 1</h1>
                  <h2 className="text-3xl font-bold">Heading 2</h2>
                  <h3 className="text-2xl font-bold">Heading 3</h3>
                  <p className="text-base">Regular paragraph text</p>
                  <p className="text-sm text-muted-foreground">Muted text</p>
                  <p className="text-xs">Small text</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {isOpen && (
          <div className="mt-4">
            <ThemeCustomizer />
          </div>
        )}
      </div>
    </div>
  );
}