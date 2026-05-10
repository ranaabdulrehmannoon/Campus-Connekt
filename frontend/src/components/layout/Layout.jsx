import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default Layout