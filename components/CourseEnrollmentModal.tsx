'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import CashfreePaymentButton from './CashfreePaymentButton';

// Form label translations for all languages
const formTranslations: Record<string, any> = {
  en: {
    enrollTitle: 'Enroll in Course',
    course: 'Course',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    city: 'City',
    address: 'Address',
    state: 'State',
    zip: 'Zip Code',
    required: 'Required',
    optional: 'Optional',
  },
  hi: {
    enrollTitle: 'कोर्स में नामांकन करें',
    course: 'कोर्स',
    firstName: 'पहला नाम',
    lastName: 'अंतिम नाम',
    email: 'ईमेल',
    phone: 'फोन',
    city: 'शहर',
    address: 'पता',
    state: 'राज्य',
    zip: 'पिन कोड',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
  },
  mr: {
    enrollTitle: 'कोर्समध्ये नोंदणी करा',
    course: 'कोर्स',
    firstName: 'पहिले नाव',
    lastName: 'आडनाव',
    email: 'ईमेल',
    phone: 'फोन',
    city: 'शहर',
    address: 'पत्ता',
    state: 'राज्य',
    zip: 'पिन कोड',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
  },
  ne: {
    enrollTitle: 'कोर्समा नामांकन गर्नुहोस्',
    course: 'कोर्स',
    firstName: 'पहिलो नाम',
    lastName: 'आखिरी नाम',
    email: 'इमेल',
    phone: 'फोन',
    city: 'शहर',
    address: 'ठेगाना',
    state: 'प्रदेश',
    zip: 'जिप कोड',
    required: 'आवश्यक',
    optional: 'वैकल्पिक',
  },
  es: {
    enrollTitle: 'Inscribirse en el Curso',
    course: 'Curso',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    city: 'Ciudad',
    address: 'Dirección',
    state: 'Estado',
    zip: 'Código Postal',
    required: 'Requerido',
    optional: 'Opcional',
  },
  fr: {
    enrollTitle: 'S\'inscrire au Cours',
    course: 'Cours',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    city: 'Ville',
    address: 'Adresse',
    state: 'État',
    zip: 'Code Postal',
    required: 'Requis',
    optional: 'Optionnel',
  },
  de: {
    enrollTitle: 'Für den Kurs anmelden',
    course: 'Kurs',
    firstName: 'Vorname',
    lastName: 'Nachname',
    email: 'E-Mail',
    phone: 'Telefon',
    city: 'Stadt',
    address: 'Adresse',
    state: 'Bundesland',
    zip: 'Postleitzahl',
    required: 'Erforderlich',
    optional: 'Optional',
  },
  pt: {
    enrollTitle: 'Inscrever-se no Curso',
    course: 'Curso',
    firstName: 'Primeiro Nome',
    lastName: 'Sobrenome',
    email: 'Email',
    phone: 'Telefone',
    city: 'Cidade',
    address: 'Endereço',
    state: 'Estado',
    zip: 'CEP',
    required: 'Obrigatório',
    optional: 'Opcional',
  },
  ja: {
    enrollTitle: 'コースに登録',
    course: 'コース',
    firstName: '名前',
    lastName: '苗字',
    email: 'メール',
    phone: '電話',
    city: '都市',
    address: '住所',
    state: '都道府県',
    zip: '郵便番号',
    required: '必須',
    optional: 'オプション',
  },
  ko: {
    enrollTitle: '코스 등록',
    course: '코스',
    firstName: '이름',
    lastName: '성',
    email: '이메일',
    phone: '전화',
    city: '도시',
    address: '주소',
    state: '주',
    zip: '우편번호',
    required: '필수',
    optional: '선택',
  },
  ar: {
    enrollTitle: 'التسجيل في الدورة',
    course: 'دورة',
    firstName: 'الاسم الأول',
    lastName: 'اسم العائلة',
    email: 'البريد الإلكتروني',
    phone: 'الهاتف',
    city: 'المدينة',
    address: 'العنوان',
    state: 'الولاية',
    zip: 'الرمز البريدي',
    required: 'مطلوب',
    optional: 'اختياري',
  },
  zh: {
    enrollTitle: '注册课程',
    course: '课程',
    firstName: '名字',
    lastName: '姓氏',
    email: '电子邮件',
    phone: '电话',
    city: '城市',
    address: '地址',
    state: '州',
    zip: '邮政编码',
    required: '必需',
    optional: '可选',
  },
  ru: {
    enrollTitle: 'Зарегистрироваться на курс',
    course: 'Курс',
    firstName: 'Имя',
    lastName: 'Фамилия',
    email: 'Электронная почта',
    phone: 'Телефон',
    city: 'Город',
    address: 'Адрес',
    state: 'Штат',
    zip: 'Почтовый индекс',
    required: 'Обязательно',
    optional: 'Необязательно',
  },
  it: {
    enrollTitle: 'Iscriviti al corso',
    course: 'Corso',
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    phone: 'Telefono',
    city: 'Città',
    address: 'Indirizzo',
    state: 'Stato',
    zip: 'CAP',
    required: 'Obbligatorio',
    optional: 'Facoltativo',
  },
  tr: {
    enrollTitle: 'Kursa Kaydol',
    course: 'Kurs',
    firstName: 'Ad',
    lastName: 'Soyadı',
    email: 'E-posta',
    phone: 'Telefon',
    city: 'Şehir',
    address: 'Adres',
    state: 'İl',
    zip: 'Posta Kodu',
    required: 'Gerekli',
    optional: 'İsteğe Bağlı',
  },
  nl: {
    enrollTitle: 'Inschrijven voor cursus',
    course: 'Cursus',
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    email: 'E-mailadres',
    phone: 'Telefoon',
    city: 'Stad',
    address: 'Adres',
    state: 'Staat',
    zip: 'Postcode',
    required: 'Verplicht',
    optional: 'Optioneel',
  },
  th: {
    enrollTitle: 'ลงทะเบียนสำหรับหลักสูตร',
    course: 'หลักสูตร',
    firstName: 'ชื่อจริง',
    lastName: 'นามสกุล',
    email: 'อีเมล',
    phone: 'โทรศัพท์',
    city: 'เมือง',
    address: 'ที่อยู่',
    state: 'จังหวัด',
    zip: 'รหัสไปรษณีย์',
    required: 'จำเป็น',
    optional: 'ตัวเลือก',
  },
  id: {
    enrollTitle: 'Daftar Kursus',
    course: 'Kursus',
    firstName: 'Nama Depan',
    lastName: 'Nama Belakang',
    email: 'Email',
    phone: 'Telepon',
    city: 'Kota',
    address: 'Alamat',
    state: 'Negara Bagian',
    zip: 'Kode Pos',
    required: 'Diperlukan',
    optional: 'Opsional',
  },
  sv: {
    enrollTitle: 'Registrera dig på kursen',
    course: 'Kurs',
    firstName: 'Förnamn',
    lastName: 'Efternamn',
    email: 'E-post',
    phone: 'Telefon',
    city: 'Stad',
    address: 'Adress',
    state: 'Län',
    zip: 'Postnummer',
    required: 'Obligatorisk',
    optional: 'Valfri',
  },
};

interface CourseEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    _id: string;
    title: string;
    pricing?: {
      INR?: { price: number };
    };
    discount?: number;
  };
  token?: string;
  language?: string;
}

export default function CourseEnrollmentModal({
  isOpen,
  onClose,
  course,
  token = '',
  language = 'en',
}: CourseEnrollmentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    state: '',
    zip: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get translations for selected language, fallback to English
  const t = formTranslations[language] || formTranslations.en;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate price
  const basePrice = course.pricing?.INR?.price || 0;
  const finalPrice = course.discount && course.discount > 0
    ? Math.round(basePrice * (1 - course.discount / 100))
    : basePrice;

  const isFormValid = formData.firstName && formData.email && formData.phone && formData.city;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t.enrollTitle}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* Course Info */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">{t.course}</p>
            <p className="font-semibold text-gray-900 mb-2">{course.title}</p>
            <div className="flex items-baseline gap-2">
              {course.discount && course.discount > 0 ? (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{basePrice.toLocaleString()}
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{finalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    {course.discount}% OFF
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-green-600">
                  ₹{finalPrice.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.firstName} *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.firstName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.lastName}
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.lastName}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.email} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.phone} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.city} *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t.city}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.address}
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={t.address}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.state}
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.state}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t.zip}
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={t.zip}
                />
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <div className="mt-6">
            <CashfreePaymentButton
              amount={finalPrice}
              productInfo={course.title}
              firstName={formData.firstName}
              lastName={formData.lastName}
              email={formData.email}
              phone={formData.phone}
              city={formData.city}
              address={formData.address}
              state={formData.state}
              zip={formData.zip}
              currency="INR"
              token={token}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all"
              disabled={!isFormValid || loading}
              onSuccess={() => {
                onClose();
              }}
              onError={(error) => {
                setError(error);
              }}
              onLoading={setLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
