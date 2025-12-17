import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingCart, User, LogIn, Mail, LogOut, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cartAPI } from '../utils/cartData';
import { toast } from 'react-toastify';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Workshops', href: '/workshops' },
    { name: 'Resort', href: '/resort' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load cart count
  useEffect(() => {
    const loadCartCount = async () => {
      try {
        if (user) {
          const userCart = await cartAPI.getUserCart(user.id);
          setCartCount(userCart.length);
        } else {
          // Show sample cart count for non-logged in users
          setCartCount(2);
        }
      } catch (error) {
        console.error('Error loading cart count:', error);
      }
    };
    
    loadCartCount();
  }, [user, location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-2 px-6 hidden md:block">
        <div className="container mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>globalswaryoga@gmail.com</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span>🧘‍♀️ Transform Your Life Through Yoga</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' 
          : 'bg-white shadow-md'
      }`}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img 
                  src="https://i.postimg.cc/Ss56Dxjm/From-Breath-To-Soal.jpg" 
                  alt="Swar Yoga Logo" 
                  className="h-12 w-auto transition-transform group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-black">
                  Swar Yoga
                </span>
                <div className="text-xs text-gray-500 -mt-1">The Science of Breath</div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 group ${
                    isActive(item.href) 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  {item.name}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-600 rounded-full"></div>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
                </Link>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link
                to="/cart"
                className="relative p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 group"
                aria-label="Shopping Cart"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {cartCount}
                  </span>
                )}
                <div className="absolute inset-0 rounded-lg bg-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity -z-10"></div>
              </Link>

              {/* User is logged in */}
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    to="/account"
                    className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <User className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-700">{user?.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Sign In */}
                  <Link
                    to="/signin"
                    className="hidden sm:flex items-center space-x-2 bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <LogIn className="h-5 w-5" />
                    <span>Sign In</span>
                  </Link>

                  {/* Sign Up */}
                  <Link
                    to="/signup"
                    className="hidden sm:block bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="lg:hidden mt-4 pb-4 border-t border-gray-200 animate-in slide-in-from-top duration-200">
              <nav className="flex flex-col space-y-2 mt-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      isActive(item.href) 
                        ? 'text-green-600 bg-green-50 border-l-4 border-green-600' 
                        : 'text-gray-700 hover:text-green-600 hover:bg-green-50'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                
                {/* Mobile Actions */}
                <div className="flex flex-col space-y-2 pt-4 border-t border-gray-200">
                  <Link
                    to="/cart"
                    className="flex items-center space-x-2 px-4 py-3 text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Cart ({cartCount})</span>
                  </Link>
                  
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/account"
                        className="flex items-center space-x-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span className="font-medium">{user?.name}</span>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMenuOpen(false);
                        }}
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/signin"
                        className="flex items-center space-x-2 px-4 py-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <LogIn className="h-5 w-5" />
                        <span>Sign In</span>
                      </Link>
                      <Link
                        to="/signup"
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 text-center font-medium shadow-lg"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* WhatsApp Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setShowWhatsApp(!showWhatsApp)}
          className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 transition-colors"
          aria-label="WhatsApp Support"
        >
          <MessageCircle className="h-7 w-7 text-white" />
        </button>
        
        {/* WhatsApp Popup */}
        {showWhatsApp && (
          <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl p-4 w-72 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800">WhatsApp Support</h3>
              </div>
              <button 
                onClick={() => setShowWhatsApp(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close WhatsApp popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Chat with us directly on WhatsApp for quick support and inquiries.
            </p>
            <a 
              href="https://wa.me/919309986820?text=Hello%20SwarYoga,%20I%20have%20a%20question%20about%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-green-500 text-white text-center py-3 rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Chat Now: +91 93099 86820
            </a>
          </div>
        )}
      </div>
    </>
  );
};

export default Header;