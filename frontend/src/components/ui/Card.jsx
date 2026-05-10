import React from 'react'

const Card = ({ children, className = '', hover = true }) => {
  return (
    <div className={`bg-white rounded-xl shadow-md ${hover ? 'hover:shadow-xl' : ''} 
                    transition-all duration-300 border border-gray-100 overflow-hidden ${className}`}>
      {children}
    </div>
  )
}

export const CardHeader = ({ children, className = '' }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
    {children}
  </div>
)

export const CardBody = ({ children, className = '' }) => (
  <div className={`px-6 py-4 ${className}`}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '' }) => (
  <div className={`px-6 py-4 bg-gray-50 border-t border-gray-200 ${className}`}>
    {children}
  </div>
)

export default Card