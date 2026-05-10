import React from 'react'
import { Link } from 'react-router-dom'
import {
  HeartIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  BuildingLibraryIcon,
  UsersIcon,
  CalendarIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

// Custom Social Media Icons
const FacebookIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879v-6.99h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.99C18.343 21.128 22 16.991 22 12z" />
  </svg>
)

const TwitterIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
  </svg>
)

const InstagramIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.364-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.904 2.013 9.244 2 11.99 2h.325zM12 7a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zm5-9a1 1 0 100 2 1 1 0 000-2z" />
  </svg>
)

const LinkedInIcon = (props) => (
  <svg {...props} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
)

const Footer = () => {
  const currentYear = new Date().getFullYear()

  const stopNavigation = (event) => {
    event.preventDefault()
  }

  const quickLinks = [
    { name: 'About Us', path: '/about', icon: BuildingLibraryIcon },
    { name: 'Contact', path: '/contact', icon: EnvelopeIcon },
    { name: 'Privacy Policy', path: '/privacy', icon: ShieldCheckIcon },
    { name: 'Terms of Service', path: '/terms', icon: DocumentTextIcon },
    { name: 'FAQs', path: '/faqs', icon: AcademicCapIcon },
    { name: 'Support', path: '/support', icon: HeartIcon },
  ]

  const features = [
    { name: 'Events', path: '/events', icon: CalendarIcon },
    { name: 'Resources', path: '/resources', icon: BookOpenIcon },
    { name: 'Societies', path: '/societies', icon: UsersIcon },
    { name: 'Study Groups', path: '/study-groups', icon: UsersIcon },
    { name: 'Mentorship', path: '/mentorship', icon: AcademicCapIcon },
    { name: 'Career Hub', path: '/career', icon: BuildingLibraryIcon },
  ]

  const contactInfo = [
    { icon: MapPinIcon, text: 'NUST Campus, H-12, Islamabad, Pakistan', link: 'https://maps.google.com' },
    { icon: EnvelopeIcon, text: 'support@nusthub.edu.pk', link: 'mailto:support@nusthub.edu.pk' },
    { icon: PhoneIcon, text: '+92 51 9085 1234', link: 'tel:+925190851234' },
    { icon: ClockIcon, text: 'Mon-Fri: 9:00 AM - 5:00 PM', link: null },
  ]

  const socialLinks = [
    { icon: FacebookIcon, name: 'Facebook', url: 'https://facebook.com/nusthub', color: 'hover:text-blue-600' },
    { icon: TwitterIcon, name: 'Twitter', url: 'https://twitter.com/nusthub', color: 'hover:text-blue-400' },
    { icon: InstagramIcon, name: 'Instagram', url: 'https://instagram.com/nusthub', color: 'hover:text-pink-600' },
    { icon: LinkedInIcon, name: 'LinkedIn', url: 'https://linkedin.com/company/nusthub', color: 'hover:text-blue-700' },
  ]

  return (
    <footer className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 border-t border-slate-700 mt-auto text-slate-200">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center group">
              <span className="text-2xl font-semibold tracking-tight text-white group-hover:text-sky-300 transition-colors">
                Campus ConneKt
              </span>
            </Link>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connecting NUST students through events, resources, and societies.
              Your one-stop platform for campus life engagement.
            </p>
            <div className="flex space-x-3 pt-2">
              {socialLinks.map((social) => (
                <button
                  key={social.name}
                  type="button"
                  onClick={stopNavigation}
                  className={`text-slate-400 transition-colors duration-200 ${social.color} hover:text-white`}
                  aria-label={social.name}
                >
                  <social.icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-sky-300 uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <button
                    type="button"
                    onClick={stopNavigation}
                    className="flex items-center text-sm text-slate-300 hover:text-white transition-colors group"
                  >
                    <ChevronRightIcon className="h-3 w-3 mr-2 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-sm font-semibold text-sky-300 uppercase tracking-wider mb-4">
              Platform Features
            </h3>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature.name}>
                  {feature.name === 'Events' || feature.name === 'Resources' || feature.name === 'Societies' ? (
                    <Link
                      to={feature.path}
                      className="flex items-center text-sm text-slate-300 hover:text-white transition-colors group"
                    >
                      <feature.icon className="h-3 w-3 mr-2 text-slate-400 group-hover:text-sky-300 transition-colors" />
                      {feature.name}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={stopNavigation}
                      className="flex items-center text-sm text-slate-300 hover:text-white transition-colors group"
                    >
                      <feature.icon className="h-3 w-3 mr-2 text-slate-400 group-hover:text-sky-300 transition-colors" />
                      {feature.name}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold text-sky-300 uppercase tracking-wider mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3">
              {contactInfo.map((info, index) => (
                <li key={index}>
                  {info.link ? (
                    <a
                      href={info.link}
                      target={info.link.startsWith('http') ? '_blank' : undefined}
                      rel={info.link.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="flex items-start space-x-3 text-sm text-slate-300 hover:text-white transition-colors group"
                    >
                      <info.icon className="h-4 w-4 text-slate-400 group-hover:text-sky-300 flex-shrink-0 mt-0.5" />
                      <span>{info.text}</span>
                    </a>
                  ) : (
                    <div className="flex items-start space-x-3 text-sm text-slate-300">
                      <info.icon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>{info.text}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            {/* Newsletter Signup */}
            <div className="mt-6">
              <h4 className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2">
                Subscribe to Newsletter
              </h4>
              <form onSubmit={(e) => e.preventDefault()} className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 text-sm bg-slate-900 border border-slate-700 text-slate-100 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 text-white text-sm font-semibold rounded-r-xl hover:from-sky-600 hover:to-indigo-600 transition-colors"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-2">
                Get updates about events and resources
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-700 bg-slate-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center text-center">
            <div className="text-sm text-slate-400">
              © {currentYear} CampusConneKt. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer