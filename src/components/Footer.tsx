import { Link } from 'react-router-dom';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Facebook, 
  Twitter, 
  Instagram, 
  Youtube, 
  Settings,
  Heart,
  ArrowRight,
  Calendar,
  Users,
  Award,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Workshops', href: '/workshops' },
    { name: 'Resort', href: '/resort' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' }
  ];

  const services = [
    { name: 'Yoga Classes', href: '/workshops' },
    { name: 'Meditation Retreats', href: '/resort' },
    { name: 'Personal Coaching', href: '/contact' },
    { name: 'Corporate Wellness', href: '/contact' },
    { name: 'Teacher Training', href: '/workshops' },
    { name: 'Online Programs', href: '/workshops' }
  ];

  const resources = [
    { name: 'Blog', href: '/blog' },
    { name: 'Free Resources', href: '#' },
    { name: 'Success Stories', href: '#' },
    { name: 'FAQ', href: '#' },
    { name: 'Terms & Conditions', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Refund Policy', href: '/refund' }
  ];

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#', color: 'hover:text-blue-600' },
    { name: 'Twitter', icon: Twitter, href: '#', color: 'hover:text-sky-500' },
    { name: 'Instagram', icon: Instagram, href: '#', color: 'hover:text-pink-600' },
    { name: 'YouTube', icon: Youtube, href: '#', color: 'hover:text-red-600' }
  ];

  const stats = [
    { icon: Users, number: '8,000+', label: 'Students Trained' },
    { icon: Calendar, number: '25+', label: 'Years Experience' },
    { icon: Award, number: '15+', label: 'Countries Reached' },
    { icon: Heart, number: '100%', label: 'Satisfaction Rate' }
  ];

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Stats Section */}
      <div className="relative border-b border-gray-700">
        <div className="container mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Transforming Lives Worldwide
            </h3>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Join thousands who have discovered the power of yoga and mindful living through our programs
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
                  <div className="text-gray-300 text-sm">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative">
        <div className="container mx-auto px-6 py-16">
          <div className="grid lg:grid-cols-5 gap-12">
            {/* Company Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <img 
                    src="https://i.postimg.cc/Ss56Dxjm/From-Breath-To-Soal.jpg" 
                    alt="Swar Yoga Logo" 
                    className="h-12 w-auto"
                  />
                </div>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Transform your life through mindful planning and holistic wellness tracking. 
                Join thousands who have discovered the power of integrated life planning through 
                ancient yogic wisdom and modern wellness practices.
              </p>
              
              {/* Newsletter Signup */}
              <div className="mb-8">
                <h4 className="font-semibold mb-4 flex items-center">
                  <Sparkles className="h-5 w-5 text-green-500 mr-2" />
                  Stay Connected
                </h4>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-l-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-white placeholder-gray-400"
                  />
                  <button className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-r-lg hover:from-green-600 hover:to-green-700 transition-all shadow-lg">
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Subscribe to receive updates, special offers, and wellness tips.
                </p>
              </div>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a 
                      key={index} 
                      href={social.href} 
                      className={`text-gray-300 hover:text-white ${social.color} transition-colors p-2 bg-gray-800 rounded-lg hover:bg-gray-700`}
                      aria-label={social.name}
                    >
                      <Icon className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-6 text-green-400 uppercase tracking-wider">Quick Links</h4>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link 
                      to={link.href} 
                      className="text-gray-300 hover:text-green-400 transition-colors flex items-center group"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-semibold mb-6 text-green-400 uppercase tracking-wider">Our Services</h4>
              <ul className="space-y-3">
                {services.map((service, index) => (
                  <li key={index}>
                    <Link 
                      to={service.href} 
                      className="text-gray-300 hover:text-green-400 transition-colors flex items-center group"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold mb-6 text-green-400 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3">
                {resources.map((resource, index) => (
                  <li key={index}>
                    <Link 
                      to={resource.href} 
                      className="text-gray-300 hover:text-green-400 transition-colors flex items-center group"
                    >
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      {resource.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contact & Admin */}
      <div className="relative border-t border-gray-700">
        <div className="container mx-auto px-6 py-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-400" />
                <span>globalswaryoga@gmail.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-green-400" />
                <span>+91 9779006820 (11AM to 5PM)</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-green-400" />
                <span>India</span>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-start md:justify-end space-y-3 sm:space-y-0 sm:space-x-6">
              <Link 
                to="/sadhaka-planner" 
                className="flex items-center space-x-2 hover:text-green-400 transition-colors group"
              >
                <LayoutDashboard className="h-5 w-5 text-green-400 group-hover:rotate-12 transition-transform duration-300" />
                <span>Life Planner</span>
              </Link>
              <Link 
                to="/swar-calendar" 
                className="flex items-center space-x-2 hover:text-green-400 transition-colors group"
              >
                <LayoutDashboard className="h-5 w-5 text-green-400 group-hover:rotate-12 transition-transform duration-300" />
                <span>Swar Calendar</span>
              </Link>
              <Link 
                to="/admin" 
                className="flex items-center space-x-2 hover:text-green-400 transition-colors group"
              >
                <Settings className="h-5 w-5 text-green-400 group-hover:rotate-90 transition-transform duration-300" />
                <span>Admin Panel</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="relative bg-black/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-center md:text-left space-y-2 md:space-y-0">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} SwarYoga.org. All rights reserved.
            </p>
            <div className="text-sm text-gray-400">
              <span>Made with </span>
              <Heart className="h-4 w-4 text-red-500 inline animate-pulse" />
              <span> and ancient wisdom</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;