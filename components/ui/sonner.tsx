"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: `
            group toast 
            group-[.toaster]:bg-gray-900 
            group-[.toaster]:text-white 
            group-[.toaster]:border-none
            group-[.toaster]:shadow-2xl 
            group-[.toaster]:rounded-lg
            group-[.toaster]:opacity-100
            group-[.toaster]:min-h-[64px]
            group-[.toaster]:px-6
            group-[.toaster]:backdrop-blur-none
            group-[.toaster]:font-[family-name:var(--font-ibm-plex-sans-thai)]
          `,
          title: "group-[.toast]:font-medium group-[.toast]:text-base group-[.toast]:font-[family-name:var(--font-ibm-plex-sans-thai)]",
          description: "group-[.toast]:text-gray-300 group-[.toast]:text-sm group-[.toast]:font-[family-name:var(--font-ibm-plex-sans-thai)]",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-gray-900 group-[.toast]:font-medium group-[.toast]:hover:bg-gray-100 group-[.toast]:font-[family-name:var(--font-ibm-plex-sans-thai)]",
          cancelButton: "group-[.toast]:text-gray-300 group-[.toast]:hover:text-white group-[.toast]:font-[family-name:var(--font-ibm-plex-sans-thai)]",
          closeButton: "group-[.toast]:text-gray-400 group-[.toast]:hover:text-white",
          error: "group-[.toaster]:bg-red-600",
          success: "group-[.toaster]:bg-green-600",
          warning: "group-[.toaster]:bg-amber-600",
          info: "group-[.toaster]:bg-blue-600",
        },
        style: {
          background: 'rgb(17 24 39)',
          color: 'white',
          opacity: 1,
          backdropFilter: 'none',
          fontFamily: 'inherit',
        }
      }}
      {...props}
    />
  )
}

export { Toaster }