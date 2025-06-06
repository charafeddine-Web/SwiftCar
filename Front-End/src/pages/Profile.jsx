import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Button from "../components/Button";
import Loader from "../components/Loader";
import { getCurrentUser, updateProfile } from "../services/auth";
import { getConducteurByUserId, updateConducteur } from "../services/conducteur";
import useFileUpload from "../hooks/useFileUpload";
import { toast } from "react-toastify";

const Profile = () => {
  const navigate = useNavigate();
  const { user, setUser } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [driverInfo, setDriverInfo] = useState(null);
  
  const { files, previews, handleFileChange, resetFiles, addFilesToFormData } = useFileUpload();
  
  const [profile, setProfile] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    photoDeProfil: null,
    
    num_permis: "",
    disponibilite: false,
    adresse: "",
    ville: "",
    date_naissance: "",
    sexe: "",
    photo_permis: null,
    photo_identite: null,
    verifications: {
      email: false,
      phone: false,
      identity: false,
      drivingLicense: false
    }
  });
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await getCurrentUser(token);
        const userData = response.data;
        console.log("waaaaaaaaaaa3",userData)
        if (userData.role === 'conducteur') {
          try {
            const driverResponse = await getConducteurByUserId(userData.id);
            const driverData = driverResponse.data;
            userData.conducteur = driverData;
          } catch (error) {
            console.error("Error loading driver data:", error);
            toast.error("Failed to load driver information");
          }
        }
        
        setProfile({
          nom: userData.nom || "",
          prenom: userData.prenom || "",
          email: userData.email || "",
          telephone: userData.telephone || "",
          photoDeProfil: userData.photoDeProfil || null,
          num_permis: userData.conducteur?.num_permis || "",
          disponibilite: userData.conducteur?.disponibilite || false,
          adresse: userData.conducteur?.adresse || "",
          ville: userData.conducteur?.ville || "",
          date_naissance: userData.conducteur?.date_naissance || "",
          sexe: userData.conducteur?.sexe || "",
          photo_permis: userData.conducteur?.photo_permis || null,
          photo_identite: userData.conducteur?.photo_identite || null,
          verifications: {
            email: userData.email_verified || false,
            phone: userData.telephone_verified || false,
            identity: !!userData.conducteur?.photo_identite,
            drivingLicense: !!userData.conducteur?.photo_permis
          }
        });

        if (userData.role === 'conducteur' && userData.conducteur) {
          setDriverInfo(userData.conducteur);
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading user data:", error);
        toast.error("Failed to load profile data");
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [navigate]);
  
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setProfile({
        ...profile,
        [section]: {
          ...profile[section],
          [field]: type === 'checkbox' ? checked : value
        }
      });
    } else {
      setProfile({
        ...profile,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = handleFileChange('photoDeProfil', file);
      setProfile({
        ...profile,
        photoDeProfil: previewUrl
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // Prepare the data for the API - create a SINGLE FormData object
      const formData = new FormData();
      
      console.log("Submitting profile update with data:", profile);
      
      formData.append('nom', profile.nom);
      formData.append('prenom', profile.prenom);
      formData.append('email', profile.email);
      formData.append('telephone', profile.telephone);

      if (user?.role === 'conducteur') {
        formData.append('num_permis', profile.num_permis || '');
        formData.append('disponibilite', profile.disponibilite ? '1' : '0'); 
        formData.append('adresse', profile.adresse || '');
        formData.append('ville', profile.ville || '');
        formData.append('date_naissance', profile.date_naissance || '');
        formData.append('sexe', profile.sexe || '');
      }

      addFilesToFormData(formData);

      // Log form data for debugging
      const plainData = {};
      formData.forEach((value, key) => {
        plainData[key] = value instanceof File ? 'File: ' + value.name : value;
      });
      console.log('Data being sent:', plainData);

      const response = await updateProfile(formData, token);
      console.log('Profile update response:', response);

      if (response.data) {
        const userResponse = await getCurrentUser(token);
        const userData = userResponse.data;
        console.log("Updated user data received:", userData);
        
        if (userData.role === 'conducteur') {
          try {
            const driverResponse = await getConducteurByUserId(userData.id);
            const driverData = driverResponse.data;
            console.log("Driver data received:", driverData);
            
            userData.conducteur = driverData;
            
            setDriverInfo(driverData);
          } catch (error) {
            console.error("Error loading driver data:", error);
            toast.error("Failed to load driver information");
          }
        }

        setProfile({
          nom: userData.nom || "",
          prenom: userData.prenom || "",
          email: userData.email || "",
          telephone: userData.telephone || "",
          photoDeProfil: userData.photoDeProfil || null,
          // Driver specific fields
          num_permis: userData.conducteur?.num_permis || "",
          disponibilite: userData.conducteur?.disponibilite || false,
          adresse: userData.conducteur?.adresse || "",
          ville: userData.conducteur?.ville || "",
          date_naissance: userData.conducteur?.date_naissance || "",
          sexe: userData.conducteur?.sexe || "",
          photo_permis: userData.conducteur?.photo_permis || null,
          photo_identite: userData.conducteur?.photo_identite || null,
          verifications: {
            email: userData.email_verified || false,
            phone: userData.telephone_verified || false,
            identity: !!userData.conducteur?.photo_identite,
            drivingLicense: !!userData.conducteur?.photo_permis
          }
        });
        
        resetFiles();

        setUser(userData);
        
        localStorage.setItem('user', JSON.stringify(userData));

        setIsEditing(false);
        setSaveSuccess(true);
        toast.success(response.data.message || "Profile updated successfully!");
        
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      console.error("Error details:", error.response);
      const errorMessage = error.response?.data?.message || "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
 
  if (isLoading) {
    return (
      <>
        <Header/>
        <div className="my-20">
        <Loader/>
        </div>
        <Footer/> 
      </>   
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {user?.role === 'conducteur' ? 'Driver Profile' : 'Passenger Profile'}
              </h1>
              <p className="text-gray-600 mt-1">
                {user?.role === 'conducteur' ? 'Manage your driver account and preferences' : 'Manage your passenger account and preferences'}
              </p>
            </div>
            {!isEditing && (
              <Button 
                onClick={() => setIsEditing(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
              >
                Edit Profile
              </Button>
            )}
          </div>
          
          {/* Success Message */}
          {saveSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Profile updated successfully!</span>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 px-8 py-6">
              <div className="flex items-center">
                <div className="relative">
                  {profile.photoDeProfil ? (
                    <img 
                      src={profile.photoDeProfil} 
                      alt="Profile" 
                      className="w-28 h-28 rounded-full border-4 border-white object-cover shadow-lg"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full border-4 border-white bg-gradient-to-r from-green-400 to-green-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {profile.prenom.charAt(0).toUpperCase()}{profile.nom.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 cursor-pointer shadow-md hover:bg-gray-100 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={handleImageChange}
                        accept="image/*" 
                      />
                    </label>
                  )}
                </div>
                <div className="ml-8">
                  <h2 className="text-2xl font-bold text-white">{profile.prenom} {profile.nom}</h2>
                  <p className="text-green-100 mt-1">Member since {new Date(user?.created_at).toLocaleDateString()}</p>
                  {user?.role === 'conducteur' && driverInfo && (
                    <div className="mt-3 flex items-center space-x-4">
                      <span className="bg-white text-green-600 px-3 py-1 rounded-full text-sm font-medium shadow-sm">
                        {user.email_verified === true ? 'Verified Driver' : 'Pending Verification'}
                      </span>
                      {driverInfo.note_moyenne && (
                        <div className="flex items-center bg-white/20 px-3 py-1 rounded-full">
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="ml-1 text-white">
                            {typeof driverInfo.note_moyenne === 'number' 
                              ? driverInfo.note_moyenne.toFixed(1)
                              : parseFloat(driverInfo.note_moyenne || 0).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Profile Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-8">
                {/* Personal Information */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">First Name</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="prenom" 
                          value={profile.prenom} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                          required 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.prenom}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">Last Name</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="nom" 
                          value={profile.nom} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                          required 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.nom}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">Email</label>
                      {isEditing ? (
                        <input 
                          type="email" 
                          name="email" 
                          value={profile.email} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                          required 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">Phone Number</label>
                      {isEditing ? (
                        <input 
                          type="tel" 
                          name="telephone" 
                          value={profile.telephone} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.telephone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">Date of Birth</label>
                      {isEditing ? (
                        <input 
                          type="date" 
                          name="date_naissance" 
                          value={profile.date_naissance} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.date_naissance ? new Date(profile.date_naissance).toLocaleDateString() : 'Not provided'}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Address */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-gray-700 mb-1 font-medium">Street Address</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="adresse" 
                          value={profile.adresse} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.adresse}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-gray-700 mb-1 font-medium">City</label>
                      {isEditing ? (
                        <input 
                          type="text" 
                          name="ville" 
                          value={profile.ville} 
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                        />
                      ) : (
                        <p className="text-gray-800">{profile.ville}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Driver-specific Information */}
                {user?.role === 'conducteur' && (
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                      </svg>
                      Driver Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-gray-700 mb-1 font-medium">License Number</label>
                        {isEditing ? (
                          <input 
                            type="text" 
                            name="num_permis" 
                            value={profile.num_permis} 
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300" 
                          />
                        ) : (
                          <p className="text-gray-800">{profile.num_permis || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 font-medium">Gender</label>
                        {isEditing ? (
                          <select 
                            name="sexe" 
                            value={profile.sexe} 
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                          >
                            <option value="">Select gender</option>
                            <option value="homme">Male</option>
                            <option value="femme">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="text-gray-800 capitalize">{profile.sexe || 'Not provided'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 font-medium">Availability</label>
                        {isEditing ? (
                          <div className="flex items-center mt-2">
                            <input 
                              type="checkbox" 
                              id="disponibilite" 
                              name="disponibilite" 
                              checked={profile.disponibilite} 
                              onChange={(e) => setProfile({...profile, disponibilite: e.target.checked})}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500" 
                            />
                            <label htmlFor="disponibilite" className="ml-2 block text-sm text-gray-700">
                              Available for rides
                            </label>
                          </div>
                        ) : (
                          <p className="text-gray-800">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              profile.disponibilite 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {profile.disponibilite ? 'Available' : 'Not Available'}
                            </span>
                          </p>
                        )}
                      </div>
                      {driverInfo && (
                        <div>
                          <label className="block text-gray-700 mb-1 font-medium">Average Rating</label>
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="ml-1 text-gray-800">
                              {typeof driverInfo.note_moyenne === 'number' 
                                ? driverInfo.note_moyenne.toFixed(1)
                                : parseFloat(driverInfo.note_moyenne || 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-gray-700 mb-1 font-medium">Driver's License Photo</label>
                        {isEditing ? (
                          <div className="mt-1 flex items-center">
                            <label className="block">
                              <span className="sr-only">Choose license photo</span>
                              <input 
                                type="file" 
                                name="photo_permis"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const previewUrl = handleFileChange('photo_permis', file);
                                    setProfile({
                                      ...profile,
                                      photo_permis: previewUrl
                                    });
                                  }
                                }}
                              />
                            </label>
                            {profile.photo_permis && (
                              <div className="ml-5 h-12 w-12 overflow-hidden rounded-md">
                                <img src={profile.photo_permis} alt="License preview" className="h-full w-full object-cover" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-800">
                            {profile.photo_permis ? 'Provided' : 'Not provided'}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 mb-1 font-medium">ID Photo</label>
                        {isEditing ? (
                          <div className="mt-1 flex items-center">
                            <label className="block">
                              <span className="sr-only">Choose ID photo</span>
                              <input 
                                type="file" 
                                name="photo_identite"
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                                onChange={(e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    const previewUrl = handleFileChange('photo_identite', file);
                                    setProfile({
                                      ...profile,
                                      photo_identite: previewUrl
                                    });
                                  }
                                }}
                              />
                            </label>
                            {profile.photo_identite && (
                              <div className="ml-5 h-12 w-12 overflow-hidden rounded-md">
                                <img src={profile.photo_identite} alt="ID preview" className="h-full w-full object-cover" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-gray-800">
                            {profile.photo_identite ? 'Provided' : 'Not provided'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Verification Status */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Verifications
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border ${profile.verifications.email ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center">
                        {profile.verifications.email ? (
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-4.707-5.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 9.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="font-medium">Email</span>
                      </div>
                      <p className="text-sm mt-1 text-gray-600">
                        {profile.verifications.email ? 'Verified' : 'Not verified'}
                      </p>
                    </div>
                    
                    <div className={`p-4 rounded-lg border ${profile.verifications.phone ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center">
                        {profile.verifications.phone ? (
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-4.707-5.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 9.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="font-medium">Phone</span>
                      </div>
                      <p className="text-sm mt-1 text-gray-600">
                        {profile.verifications.phone ? 'Verified' : 'Not verified'}
                      </p>
                    </div>
                    
                    {user?.role === 'conducteur' && (
                      <>
                        <div className={`p-4 rounded-lg border ${profile.verifications.identity ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center">
                            {profile.verifications.identity ? (
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-4.707-5.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 9.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="font-medium">ID Verification</span>
                          </div>
                          <p className="text-sm mt-1 text-gray-600">
                            {profile.verifications.identity ? 'Verified' : 'Not verified'}
                          </p>
                          {!profile.verifications.identity && (
                            <Button 
                              type="button"
                              className="mt-2 text-sm bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                              onClick={() => navigate('/verify-email')}
                            >
                              Verify Now
                            </Button>
                          )}
                        </div>
                        
                        <div className={`p-4 rounded-lg border ${profile.verifications.drivingLicense ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center">
                            {profile.verifications.drivingLicense ? (
                              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-4.707-5.293a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 9.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            <span className="font-medium">Driving License</span>
                          </div>
                          <p className="text-sm mt-1 text-gray-600">
                            {profile.verifications.drivingLicense ? 'Verified' : 'Not verified'}
                          </p>
                          {!profile.verifications.drivingLicense && (
                            <Button 
                              type="button"
                              className="mt-2 text-sm bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                              onClick={() => navigate('/verify-license')}
                            >
                              Verify Now
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Form Actions */}
              {isEditing && (
                <div className="px-8 py-4 bg-gray-50 border-t flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 text-gray-700 border border-gray-300 hover:bg-gray-50 px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Profile;