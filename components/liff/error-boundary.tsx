'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class LiffErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LIFF Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                เกิดข้อผิดพลาด
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {this.state.error?.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  โหลดใหม่
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                >
                  กลับหน้าหลัก
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}