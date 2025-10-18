/**
 * Global History Seeder
 * Populates Firestore with 200-400 significant world events (1600-present)
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const crypto = require('crypto');

// Initialize Firebase Admin
if (!getApps().length) {
  // For local development, use environment variables
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  
  // Try to use service account if available, otherwise use config
  try {
    const serviceAccount = require('../serviceAccountKey.json');
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log('✅ Using service account credentials');
  } catch (error) {
    // Fall back to regular config
    initializeApp(config);
    console.log('✅ Using environment config');
  }
}

const db = getFirestore();

// Color console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

/**
 * Generate urlHash for deduplication
 */
function generateUrlHash(title, date) {
  return crypto.createHash('sha1').update(`${title}${date}`).digest('hex');
}

/**
 * Curated dataset of significant world events (1600-present)
 */
const GLOBAL_EVENTS = [
  // 1600s
  { title: "Founding of Jamestown", date: "1607-05-14", description: "First permanent English settlement in North America established in Virginia", category: "Exploration", location: "Jamestown, Virginia, USA", lat: 37.2054, lng: -76.7752, verifiedSource: "https://en.wikipedia.org/wiki/Jamestown,_Virginia", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Jamestowne.jpg/320px-Jamestowne.jpg", credibility: 95 },
  { title: "Galileo observes Jupiter's moons", date: "1610-01-07", description: "Galileo Galilei discovers four largest moons of Jupiter, providing evidence for Copernican system", category: "Science", location: "Padua, Italy", lat: 45.4064, lng: 11.8768, verifiedSource: "https://en.wikipedia.org/wiki/Galilean_moons", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Galilean_moon_Laplace_resonance_animation.gif/220px-Galilean_moon_Laplace_resonance_animation.gif", credibility: 98 },
  { title: "Mayflower arrives in America", date: "1620-11-11", description: "Pilgrims arrive at Plymouth Rock aboard the Mayflower, establishing Plymouth Colony", category: "Exploration", location: "Plymouth, Massachusetts, USA", lat: 41.9584, lng: -70.6673, verifiedSource: "https://en.wikipedia.org/wiki/Mayflower", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/William_Halsall_-_Mayflower_in_Plymouth_Harbor.jpg/320px-William_Halsall_-_Mayflower_in_Plymouth_Harbor.jpg", credibility: 96 },
  { title: "Thirty Years' War begins", date: "1618-05-23", description: "Major European conflict begins with Defenestration of Prague, devastating Central Europe", category: "War", location: "Prague, Czech Republic", lat: 50.0755, lng: 14.4378, verifiedSource: "https://en.wikipedia.org/wiki/Thirty_Years%27_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Jacques_Callot_-_Hanging_-_WGA03723.jpg/280px-Jacques_Callot_-_Hanging_-_WGA03723.jpg", credibility: 97 },
  { title: "English Civil War begins", date: "1642-08-22", description: "Conflict between Parliamentarians and Royalists begins, leading to execution of King Charles I", category: "War", location: "Nottingham, England", lat: 52.9548, lng: -1.1581, verifiedSource: "https://en.wikipedia.org/wiki/English_Civil_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Battle_of_Naseby.jpg/320px-Battle_of_Naseby.jpg", credibility: 96 },
  { title: "Treaty of Westphalia", date: "1648-10-24", description: "Peace treaties ending the Thirty Years' War and establishing modern state sovereignty", category: "Politics", location: "Münster, Germany", lat: 51.9607, lng: 7.6261, verifiedSource: "https://en.wikipedia.org/wiki/Peace_of_Westphalia", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Westfaelischer_Friede_in_Muenster_%28Gerard_Terborch_1648%29.jpg/280px-Westfaelischer_Friede_in_Muenster_%28Gerard_Terborch_1648%29.jpg", credibility: 98 },
  { title: "Great Fire of London", date: "1666-09-02", description: "Major conflagration destroys much of central London over four days", category: "Environment", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/Great_Fire_of_London", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Great_Fire_London.jpg/320px-Great_Fire_London.jpg", credibility: 97 },
  { title: "Newton publishes Principia Mathematica", date: "1687-07-05", description: "Isaac Newton publishes his laws of motion and universal gravitation", category: "Science", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/Philosophi%C3%A6_Naturalis_Principia_Mathematica", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Prinicipia-title.png/220px-Prinicipia-title.png", credibility: 99 },

  // 1700s
  { title: "Act of Union creates Great Britain", date: "1707-05-01", description: "England and Scotland unite to form the Kingdom of Great Britain", category: "Politics", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/Acts_of_Union_1707", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Treaty_of_Union.jpg/220px-Treaty_of_Union.jpg", credibility: 97 },
  { title: "First steam engine", date: "1712-01-01", description: "Thomas Newcomen develops first practical steam engine for pumping water from mines", category: "Technology", location: "Dudley, England", lat: 52.5090, lng: -2.0889, verifiedSource: "https://en.wikipedia.org/wiki/Newcomen_atmospheric_engine", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Newcomen_atmospheric_engine.png/220px-Newcomen_atmospheric_engine.png", credibility: 95 },
  { title: "Seven Years' War begins", date: "1756-05-17", description: "Global conflict involving most European great powers, fighting across five continents", category: "War", location: "Europe, Global", lat: 50.0, lng: 10.0, verifiedSource: "https://en.wikipedia.org/wiki/Seven_Years%27_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Seven_Years_War.png/300px-Seven_Years_War.png", credibility: 96 },
  { title: "Declaration of Independence", date: "1776-07-04", description: "Thirteen American colonies declare independence from British rule", category: "Politics", location: "Philadelphia, Pennsylvania, USA", lat: 39.9526, lng: -75.1652, verifiedSource: "https://en.wikipedia.org/wiki/United_States_Declaration_of_Independence", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/United_States_Declaration_of_Independence.jpg/240px-United_States_Declaration_of_Independence.jpg", credibility: 99 },
  { title: "French Revolution begins", date: "1789-07-14", description: "Storming of the Bastille marks beginning of French Revolution", category: "Politics", location: "Paris, France", lat: 48.8566, lng: 2.3522, verifiedSource: "https://en.wikipedia.org/wiki/French_Revolution", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Prise_de_la_Bastille.jpg/300px-Prise_de_la_Bastille.jpg", credibility: 98 },
  { title: "First vaccination", date: "1796-05-14", description: "Edward Jenner performs first successful vaccination against smallpox", category: "Medicine", location: "Berkeley, England", lat: 51.6928, lng: -2.4586, verifiedSource: "https://en.wikipedia.org/wiki/Edward_Jenner", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Edward_Jenner2.jpg/220px-Edward_Jenner2.jpg", credibility: 98 },
  { title: "Rosetta Stone discovered", date: "1799-07-15", description: "French soldiers find Rosetta Stone in Egypt, key to deciphering hieroglyphics", category: "Culture", location: "Rashid, Egypt", lat: 31.3992, lng: 30.4117, verifiedSource: "https://en.wikipedia.org/wiki/Rosetta_Stone", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Rosetta_Stone.JPG/170px-Rosetta_Stone.JPG", credibility: 97 },

  // 1800s
  { title: "Louisiana Purchase", date: "1803-04-30", description: "United States purchases Louisiana Territory from France, doubling its size", category: "Politics", location: "New Orleans, Louisiana, USA", lat: 29.9511, lng: -90.0715, verifiedSource: "https://en.wikipedia.org/wiki/Louisiana_Purchase", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Louisiana_Purchase.png/300px-Louisiana_Purchase.png", credibility: 97 },
  { title: "Battle of Trafalgar", date: "1805-10-21", description: "British Royal Navy defeats Franco-Spanish fleet; Admiral Nelson killed in action", category: "War", location: "Cape Trafalgar, Spain", lat: 36.1833, lng: -6.0333, verifiedSource: "https://en.wikipedia.org/wiki/Battle_of_Trafalgar", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Battle_of_Trafalgar%2C_1805.jpg/320px-Battle_of_Trafalgar%2C_1805.jpg", credibility: 98 },
  { title: "Napoleon invades Russia", date: "1812-06-24", description: "Napoleon's Grande Armée crosses into Russia, beginning disastrous campaign", category: "War", location: "Moscow, Russia", lat: 55.7558, lng: 37.6173, verifiedSource: "https://en.wikipedia.org/wiki/French_invasion_of_Russia", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Minard.png/350px-Minard.png", credibility: 97 },
  { title: "Battle of Waterloo", date: "1815-06-18", description: "Napoleon Bonaparte defeated by Allied armies, ending Napoleonic Wars", category: "War", location: "Waterloo, Belgium", lat: 50.7158, lng: 4.4022, verifiedSource: "https://en.wikipedia.org/wiki/Battle_of_Waterloo", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Battle_of_Waterloo_1815.PNG/320px-Battle_of_Waterloo_1815.PNG", credibility: 98 },
  { title: "First photograph", date: "1826-01-01", description: "Joseph Nicéphore Niépce creates first permanent photograph 'View from the Window at Le Gras'", category: "Technology", location: "Saint-Loup-de-Varennes, France", lat: 46.8500, lng: 4.8667, verifiedSource: "https://en.wikipedia.org/wiki/View_from_the_Window_at_Le_Gras", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/View_from_the_Window_at_Le_Gras%2C_Joseph_Nic%C3%A9phore_Ni%C3%A9pce.jpg/220px-View_from_the_Window_at_Le_Gras%2C_Joseph_Nic%C3%A9phore_Ni%C3%A9pce.jpg", credibility: 96 },
  { title: "Abolition of slavery in British Empire", date: "1833-08-28", description: "Slavery Abolition Act ends slavery throughout most of British Empire", category: "Human Rights", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/Slavery_Abolition_Act_1833", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Am_I_Not_a_Man_and_a_Brother.jpg/170px-Am_I_Not_a_Man_and_a_Brother.jpg", credibility: 98 },
  { title: "First telegraph message", date: "1844-05-24", description: "Samuel Morse sends first telegraph message 'What hath God wrought' from Washington to Baltimore", category: "Technology", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Electrical_telegraph", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/What_Hath_God_Wrought_Morse_Telegraph_1844.jpg/280px-What_Hath_God_Wrought_Morse_Telegraph_1844.jpg", credibility: 96 },
  { title: "California Gold Rush begins", date: "1848-01-24", description: "Gold discovered at Sutter's Mill, sparking mass migration to California", category: "Economy", location: "Coloma, California, USA", lat: 38.8006, lng: -120.8938, verifiedSource: "https://en.wikipedia.org/wiki/California_Gold_Rush", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/California_gold_rush_handbill.jpg/200px-California_gold_rush_handbill.jpg", credibility: 95 },
  { title: "Communist Manifesto published", date: "1848-02-21", description: "Karl Marx and Friedrich Engels publish The Communist Manifesto", category: "Politics", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/The_Communist_Manifesto", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Communist-manifesto.png/220px-Communist-manifesto.png", credibility: 97 },
  { title: "Darwin publishes Origin of Species", date: "1859-11-24", description: "Charles Darwin publishes On the Origin of Species, introducing theory of evolution", category: "Science", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/On_the_Origin_of_Species", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Origin_of_Species_title_page.jpg/220px-Origin_of_Species_title_page.jpg", credibility: 99 },
  { title: "American Civil War begins", date: "1861-04-12", description: "Confederate forces fire on Fort Sumter, starting American Civil War", category: "War", location: "Charleston, South Carolina, USA", lat: 32.7765, lng: -79.9311, verifiedSource: "https://en.wikipedia.org/wiki/American_Civil_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Battle_of_Fort_Sumter.png/300px-Battle_of_Fort_Sumter.png", credibility: 98 },
  { title: "Emancipation Proclamation", date: "1863-01-01", description: "Abraham Lincoln issues proclamation declaring freedom for slaves in Confederate states", category: "Human Rights", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Emancipation_Proclamation", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Emancipation_Proclamation.jpg/170px-Emancipation_Proclamation.jpg", credibility: 99 },
  { title: "First Transcontinental Railroad completed", date: "1869-05-10", description: "Golden Spike driven at Promontory Summit, completing first transcontinental railroad in USA", category: "Technology", location: "Promontory Summit, Utah, USA", lat: 41.6200, lng: -112.5489, verifiedSource: "https://en.wikipedia.org/wiki/First_transcontinental_railroad", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/East_and_West_Shaking_hands_at_the_laying_of_last_rail_Union_Pacific_Railroad_-_Restoration.jpg/320px-East_and_West_Shaking_hands_at_the_laying_of_last_rail_Union_Pacific_Railroad_-_Restoration.jpg", credibility: 96 },
  { title: "First telephone call", date: "1876-03-10", description: "Alexander Graham Bell makes first successful telephone call", category: "Technology", location: "Boston, Massachusetts, USA", lat: 42.3601, lng: -71.0589, verifiedSource: "https://en.wikipedia.org/wiki/Invention_of_the_telephone", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Bell_Telephone_1876.jpg/220px-Bell_Telephone_1876.jpg", credibility: 97 },
  { title: "First electric light bulb", date: "1879-10-21", description: "Thomas Edison successfully tests first long-lasting electric light bulb", category: "Technology", location: "Menlo Park, New Jersey, USA", lat: 40.5995, lng: -74.3265, verifiedSource: "https://en.wikipedia.org/wiki/Incandescent_light_bulb", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Replica_of_first_light_bulb.jpg/170px-Replica_of_first_light_bulb.jpg", credibility: 96 },
  { title: "Eiffel Tower completed", date: "1889-03-31", description: "Gustave Eiffel completes iconic iron tower for 1889 Paris Exposition", category: "Culture", location: "Paris, France", lat: 48.8584, lng: 2.2945, verifiedSource: "https://en.wikipedia.org/wiki/Eiffel_Tower", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/160px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg", credibility: 97 },

  // 1900s
  { title: "Wright Brothers first flight", date: "1903-12-17", description: "Orville and Wilbur Wright achieve first powered, sustained, and controlled airplane flight", category: "Technology", location: "Kitty Hawk, North Carolina, USA", lat: 36.0626, lng: -75.7023, verifiedSource: "https://en.wikipedia.org/wiki/Wright_brothers", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Wrightflyer.jpg/320px-Wrightflyer.jpg", credibility: 99 },
  { title: "Einstein publishes relativity theory", date: "1905-09-26", description: "Albert Einstein publishes special theory of relativity, revolutionizing physics", category: "Science", location: "Bern, Switzerland", lat: 46.9480, lng: 7.4474, verifiedSource: "https://en.wikipedia.org/wiki/Annus_Mirabilis_papers", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/220px-Albert_Einstein_Head.jpg", credibility: 99 },
  { title: "San Francisco Earthquake", date: "1906-04-18", description: "Magnitude 7.9 earthquake devastates San Francisco, followed by massive fires", category: "Environment", location: "San Francisco, California, USA", lat: 37.7749, lng: -122.4194, verifiedSource: "https://en.wikipedia.org/wiki/1906_San_Francisco_earthquake", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/San_Francisco_Fire_Sacramento_Street_1906-04-18.jpg/320px-San_Francisco_Fire_Sacramento_Street_1906-04-18.jpg", credibility: 97 },
  { title: "Titanic sinks", date: "1912-04-15", description: "RMS Titanic sinks after hitting iceberg, killing over 1,500 people", category: "Environment", location: "North Atlantic Ocean", lat: 41.7325, lng: -49.9469, verifiedSource: "https://en.wikipedia.org/wiki/Sinking_of_the_Titanic", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/RMS_Titanic_3.jpg/320px-RMS_Titanic_3.jpg", credibility: 98 },
  { title: "World War I begins", date: "1914-07-28", description: "Austria-Hungary declares war on Serbia, triggering chain reaction among European powers", category: "War", location: "Sarajevo, Bosnia", lat: 43.8563, lng: 18.4131, verifiedSource: "https://en.wikipedia.org/wiki/World_War_I", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/British_plan_Bazentin_Ridge_14_July_1916.png/300px-British_plan_Bazentin_Ridge_14_July_1916.png", credibility: 99 },
  { title: "Russian Revolution", date: "1917-11-07", description: "Bolsheviks overthrow provisional government in October Revolution", category: "Politics", location: "Petrograd, Russia", lat: 59.9311, lng: 30.3609, verifiedSource: "https://en.wikipedia.org/wiki/October_Revolution", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Revolutionary_Petrograd.jpg/280px-Revolutionary_Petrograd.jpg", credibility: 98 },
  { title: "Spanish Flu pandemic begins", date: "1918-03-01", description: "Deadly influenza pandemic spreads globally, killing 50-100 million people", category: "Pandemic", location: "Global", lat: 0, lng: 0, verifiedSource: "https://en.wikipedia.org/wiki/Spanish_flu", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/1918_flu_in_Oakland.png/300px-1918_flu_in_Oakland.png", credibility: 98 },
  { title: "Treaty of Versailles signed", date: "1919-06-28", description: "Peace treaty signed ending World War I, imposing harsh terms on Germany", category: "Politics", location: "Versailles, France", lat: 48.8049, lng: 2.1204, verifiedSource: "https://en.wikipedia.org/wiki/Treaty_of_Versailles", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Big_four.jpg/280px-Big_four.jpg", credibility: 98 },
  { title: "Women's suffrage in USA", date: "1920-08-18", description: "19th Amendment ratified, granting women right to vote in United States", category: "Human Rights", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Nineteenth_Amendment_to_the_United_States_Constitution", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Women%27s_Suffrage_Headquarters_Cleveland.jpg/280px-Women%27s_Suffrage_Headquarters_Cleveland.jpg", credibility: 98 },
  { title: "Discovery of penicillin", date: "1928-09-28", description: "Alexander Fleming discovers penicillin, first widely-used antibiotic", category: "Medicine", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/Penicillin", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Penicillin-core.svg/200px-Penicillin-core.svg.png", credibility: 99 },
  { title: "Wall Street Crash", date: "1929-10-29", description: "Stock market crashes on Black Tuesday, beginning Great Depression", category: "Economy", location: "New York City, New York, USA", lat: 40.7128, lng: -74.0060, verifiedSource: "https://en.wikipedia.org/wiki/Wall_Street_Crash_of_1929", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Crowd_outside_nyse.jpg/300px-Crowd_outside_nyse.jpg", credibility: 98 },
  { title: "Empire State Building completed", date: "1931-05-01", description: "Empire State Building completed, becoming world's tallest building", category: "Culture", location: "New York City, New York, USA", lat: 40.7484, lng: -73.9857, verifiedSource: "https://en.wikipedia.org/wiki/Empire_State_Building", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Empire_State_Building_%28aerial_view%29.jpg/170px-Empire_State_Building_%28aerial_view%29.jpg", credibility: 96 },
  { title: "Hitler becomes German Chancellor", date: "1933-01-30", description: "Adolf Hitler appointed Chancellor of Germany, beginning Nazi regime", category: "Politics", location: "Berlin, Germany", lat: 52.5200, lng: 13.4050, verifiedSource: "https://en.wikipedia.org/wiki/Adolf_Hitler%27s_rise_to_power", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bundesarchiv_Bild_102-02134%2C_Berlin%2C_Fackelzug_der_Nationalsozialisten.jpg/280px-Bundesarchiv_Bild_102-02134%2C_Berlin%2C_Fackelzug_der_Nationalsozialisten.jpg", credibility: 99 },
  { title: "World War II begins", date: "1939-09-01", description: "Germany invades Poland, Britain and France declare war on Germany", category: "War", location: "Warsaw, Poland", lat: 52.2297, lng: 21.0122, verifiedSource: "https://en.wikipedia.org/wiki/World_War_II", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Polish_infantry_marching_-_1939.jpg/300px-Polish_infantry_marching_-_1939.jpg", credibility: 99 },
  { title: "Pearl Harbor attack", date: "1941-12-07", description: "Japanese attack on Pearl Harbor brings United States into World War II", category: "War", location: "Pearl Harbor, Hawaii, USA", lat: 21.3645, lng: -157.9510, verifiedSource: "https://en.wikipedia.org/wiki/Attack_on_Pearl_Harbor", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/The_USS_Arizona_%28BB-39%29_burning_after_the_Japanese_attack_on_Pearl_Harbor_-_NARA_195617_-_Edit.jpg/320px-The_USS_Arizona_%28BB-39%29_burning_after_the_Japanese_attack_on_Pearl_Harbor_-_NARA_195617_-_Edit.jpg", credibility: 99 },
  { title: "D-Day Normandy landings", date: "1944-06-06", description: "Allied forces launch massive invasion of Nazi-occupied France", category: "War", location: "Normandy, France", lat: 49.3333, lng: -0.3667, verifiedSource: "https://en.wikipedia.org/wiki/Normandy_landings", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg/320px-Into_the_Jaws_of_Death_23-0455M_edit.jpg", credibility: 99 },
  { title: "Atomic bomb on Hiroshima", date: "1945-08-06", description: "United States drops first atomic bomb on Hiroshima, Japan", category: "War", location: "Hiroshima, Japan", lat: 34.3853, lng: 132.4553, verifiedSource: "https://en.wikipedia.org/wiki/Atomic_bombings_of_Hiroshima_and_Nagasaki", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Atomic_bombing_of_Japan.jpg/280px-Atomic_bombing_of_Japan.jpg", credibility: 99 },
  { title: "United Nations founded", date: "1945-10-24", description: "United Nations Charter comes into force, establishing international organization", category: "Politics", location: "San Francisco, California, USA", lat: 37.7749, lng: -122.4194, verifiedSource: "https://en.wikipedia.org/wiki/United_Nations", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Flag_of_the_United_Nations.svg/255px-Flag_of_the_United_Nations.svg.png", credibility: 98 },
  { title: "India gains independence", date: "1947-08-15", description: "India achieves independence from British Empire, partition creates Pakistan", category: "Politics", location: "New Delhi, India", lat: 28.6139, lng: 77.2090, verifiedSource: "https://en.wikipedia.org/wiki/Indian_independence_movement", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Lord_Mountbatten_swears_in_Jawaharlal_Nehru_as_the_first_Prime_Minister_of_free_India.jpg/280px-Lord_Mountbatten_swears_in_Jawaharlal_Nehru_as_the_first_Prime_Minister_of_free_India.jpg", credibility: 98 },
  { title: "State of Israel established", date: "1948-05-14", description: "David Ben-Gurion declares establishment of State of Israel", category: "Politics", location: "Tel Aviv, Israel", lat: 32.0853, lng: 34.7818, verifiedSource: "https://en.wikipedia.org/wiki/Israeli_Declaration_of_Independence", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Declaration_of_State_of_Israel_1948.jpg/280px-Declaration_of_State_of_Israel_1948.jpg", credibility: 97 },
  { title: "NATO founded", date: "1949-04-04", description: "North Atlantic Treaty Organization formed as military alliance against Soviet Union", category: "Politics", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/NATO", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Flag_of_NATO.svg/255px-Flag_of_NATO.svg.png", credibility: 97 },
  { title: "Korean War begins", date: "1950-06-25", description: "North Korean forces invade South Korea, beginning Korean War", category: "War", location: "Seoul, South Korea", lat: 37.5665, lng: 126.9780, verifiedSource: "https://en.wikipedia.org/wiki/Korean_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Korean_War_Montage_2.png/300px-Korean_War_Montage_2.png", credibility: 98 },
  { title: "DNA structure discovered", date: "1953-02-28", description: "Watson and Crick discover double helix structure of DNA", category: "Science", location: "Cambridge, England", lat: 52.2053, lng: 0.1218, verifiedSource: "https://en.wikipedia.org/wiki/Molecular_Structure_of_Nucleic_Acids:_A_Structure_for_Deoxyribose_Nucleic_Acid", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/DNA_Structure%2BKey%2BLabelled.pn_NoBB.png/200px-DNA_Structure%2BKey%2BLabelled.pn_NoBB.png", credibility: 99 },
  { title: "Sputnik 1 launched", date: "1957-10-04", description: "Soviet Union launches first artificial satellite, beginning space age", category: "Space", location: "Baikonur Cosmodrome, Kazakhstan", lat: 45.9650, lng: 63.3050, verifiedSource: "https://en.wikipedia.org/wiki/Sputnik_1", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Sputnik_asm.jpg/220px-Sputnik_asm.jpg", credibility: 98 },
  { title: "Cuban Missile Crisis", date: "1962-10-16", description: "13-day confrontation between US and USSR over Soviet nuclear missiles in Cuba", category: "Politics", location: "Cuba", lat: 21.5218, lng: -77.7812, verifiedSource: "https://en.wikipedia.org/wiki/Cuban_Missile_Crisis", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Cuban_Missile_Crisis_Map.svg/300px-Cuban_Missile_Crisis_Map.svg.png", credibility: 98 },
  { title: "JFK assassination", date: "1963-11-22", description: "President John F. Kennedy assassinated in Dallas, Texas", category: "Politics", location: "Dallas, Texas, USA", lat: 32.7767, lng: -96.7970, verifiedSource: "https://en.wikipedia.org/wiki/Assassination_of_John_F._Kennedy", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/JFK_limousine.png/300px-JFK_limousine.png", credibility: 99 },
  { title: "Civil Rights Act of 1964", date: "1964-07-02", description: "Landmark legislation outlaws discrimination based on race, color, religion, sex, or origin", category: "Human Rights", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Civil_Rights_Act_of_1964", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Lyndon_Johnson_signing_Civil_Rights_Act%2C_July_2%2C_1964.jpg/320px-Lyndon_Johnson_signing_Civil_Rights_Act%2C_July_2%2C_1964.jpg", credibility: 98 },
  { title: "First human on the Moon", date: "1969-07-20", description: "Neil Armstrong becomes first human to walk on the Moon during Apollo 11 mission", category: "Space", location: "Moon", lat: 0, lng: 0, verifiedSource: "https://en.wikipedia.org/wiki/Apollo_11", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/220px-Aldrin_Apollo_11_original.jpg", credibility: 99 },
  { title: "Watergate scandal", date: "1972-06-17", description: "Break-in at Democratic National Committee headquarters leads to Nixon's resignation", category: "Politics", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Watergate_scandal", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Watergate_complex.jpg/300px-Watergate_complex.jpg", credibility: 98 },
  { title: "Vietnam War ends", date: "1975-04-30", description: "Fall of Saigon marks end of Vietnam War and reunification of Vietnam", category: "War", location: "Saigon, Vietnam", lat: 10.8231, lng: 106.6297, verifiedSource: "https://en.wikipedia.org/wiki/Fall_of_Saigon", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Saigon-hubert-van-es.jpg/280px-Saigon-hubert-van-es.jpg", credibility: 97 },
  { title: "Chernobyl disaster", date: "1986-04-26", description: "Nuclear reactor explosion at Chernobyl plant, worst nuclear disaster in history", category: "Environment", location: "Pripyat, Ukraine", lat: 51.4045, lng: 30.0542, verifiedSource: "https://en.wikipedia.org/wiki/Chernobyl_disaster", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Chernobyl_Disaster.jpg/300px-Chernobyl_Disaster.jpg", credibility: 98 },
  { title: "Fall of Berlin Wall", date: "1989-11-09", description: "Berlin Wall falls, symbolizing end of Cold War and reunification of Germany", category: "Politics", location: "Berlin, Germany", lat: 52.5200, lng: 13.4050, verifiedSource: "https://en.wikipedia.org/wiki/Berlin_Wall", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Thefalloftheberlinwall1989.JPG/300px-Thefalloftheberlinwall1989.JPG", credibility: 98 },
  { title: "Nelson Mandela released", date: "1990-02-11", description: "Nelson Mandela released from prison after 27 years, ending apartheid era", category: "Human Rights", location: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241, verifiedSource: "https://en.wikipedia.org/wiki/Nelson_Mandela", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/220px-Nelson_Mandela_1994.jpg", credibility: 98 },
  { title: "World Wide Web launched", date: "1991-08-06", description: "Tim Berners-Lee releases World Wide Web to public, revolutionizing internet", category: "Technology", location: "Geneva, Switzerland", lat: 46.2044, lng: 6.1432, verifiedSource: "https://en.wikipedia.org/wiki/World_Wide_Web", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/WWW_logo_by_Robert_Cailliau.svg/220px-WWW_logo_by_Robert_Cailliau.svg.png", credibility: 98 },
  { title: "Soviet Union dissolves", date: "1991-12-26", description: "Soviet Union officially dissolves, ending 69 years of communist rule", category: "Politics", location: "Moscow, Russia", lat: 55.7558, lng: 37.6173, verifiedSource: "https://en.wikipedia.org/wiki/Dissolution_of_the_Soviet_Union", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Dissolution_of_USSR.png/300px-Dissolution_of_USSR.png", credibility: 98 },

  // 2000s
  { title: "September 11 attacks", date: "2001-09-11", description: "Terrorist attacks on World Trade Center and Pentagon kill nearly 3,000 people", category: "War", location: "New York City, New York, USA", lat: 40.7128, lng: -74.0060, verifiedSource: "https://en.wikipedia.org/wiki/September_11_attacks", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/WTC_smoking_on_9-11.jpeg/280px-WTC_smoking_on_9-11.jpeg", credibility: 99 },
  { title: "Human Genome Project completed", date: "2003-04-14", description: "Human Genome Project successfully sequences entire human genome", category: "Science", location: "Global", lat: 0, lng: 0, verifiedSource: "https://en.wikipedia.org/wiki/Human_Genome_Project", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Human_genome_to_be_broken.png/280px-Human_genome_to_be_broken.png", credibility: 97 },
  { title: "Facebook founded", date: "2004-02-04", description: "Mark Zuckerberg launches Facebook from Harvard dorm room", category: "Technology", location: "Cambridge, Massachusetts, USA", lat: 42.3736, lng: -71.1097, verifiedSource: "https://en.wikipedia.org/wiki/Facebook", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/2021_Facebook_icon.svg/200px-2021_Facebook_icon.svg.png", credibility: 95 },
  { title: "Indian Ocean tsunami", date: "2004-12-26", description: "Massive tsunami triggered by earthquake kills over 230,000 people in 14 countries", category: "Environment", location: "Indian Ocean", lat: 3.3, lng: 95.8, verifiedSource: "https://en.wikipedia.org/wiki/2004_Indian_Ocean_earthquake_and_tsunami", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Lhoknga_-_Tsunami_Damage.jpg/300px-Lhoknga_-_Tsunami_Damage.jpg", credibility: 98 },
  { title: "Barack Obama elected President", date: "2008-11-04", description: "Barack Obama elected as first African American President of the United States", category: "Politics", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Barack_Obama", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/President_Barack_Obama.jpg/220px-President_Barack_Obama.jpg", credibility: 98 },
  { title: "Bitcoin created", date: "2009-01-03", description: "Satoshi Nakamoto mines first Bitcoin block, creating first cryptocurrency", category: "Technology", location: "Internet", lat: 0, lng: 0, verifiedSource: "https://en.wikipedia.org/wiki/Bitcoin", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/200px-Bitcoin.svg.png", credibility: 96 },
  { title: "Arab Spring begins", date: "2010-12-17", description: "Revolutionary wave of protests sweeps across Arab world", category: "Politics", location: "Tunis, Tunisia", lat: 36.8065, lng: 10.1815, verifiedSource: "https://en.wikipedia.org/wiki/Arab_Spring", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Protester_in_Tahrir_Square.jpg/220px-Protester_in_Tahrir_Square.jpg", credibility: 96 },
  { title: "Fukushima nuclear disaster", date: "2011-03-11", description: "Earthquake and tsunami cause nuclear disaster at Fukushima Daiichi plant", category: "Environment", location: "Fukushima, Japan", lat: 37.4211, lng: 141.0328, verifiedSource: "https://en.wikipedia.org/wiki/Fukushima_nuclear_disaster", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Fukushima_I_by_Digital_Globe.jpg/300px-Fukushima_I_by_Digital_Globe.jpg", credibility: 98 },
  { title: "Higgs boson discovered", date: "2012-07-04", description: "CERN announces discovery of Higgs boson particle, confirming Standard Model", category: "Science", location: "Geneva, Switzerland", lat: 46.2044, lng: 6.1432, verifiedSource: "https://en.wikipedia.org/wiki/Higgs_boson", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/CMS_Higgs-event.jpg/300px-CMS_Higgs-event.jpg", credibility: 98 },
  { title: "Edward Snowden leaks", date: "2013-06-05", description: "Edward Snowden reveals NSA mass surveillance programs", category: "Politics", location: "Hong Kong", lat: 22.3193, lng: 114.1694, verifiedSource: "https://en.wikipedia.org/wiki/Edward_Snowden", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Edward_Snowden-2.jpg/220px-Edward_Snowden-2.jpg", credibility: 96 },
  { title: "Paris Climate Agreement", date: "2015-12-12", description: "195 countries adopt first universal climate agreement to limit global warming", category: "Environment", location: "Paris, France", lat: 48.8566, lng: 2.3522, verifiedSource: "https://en.wikipedia.org/wiki/Paris_Agreement", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/COP21_participants_-_30_Nov_2015_%2823430273715%29.jpg/300px-COP21_participants_-_30_Nov_2015_%2823430273715%29.jpg", credibility: 97 },
  { title: "Brexit referendum", date: "2016-06-23", description: "United Kingdom votes to leave European Union in historic referendum", category: "Politics", location: "London, England", lat: 51.5074, lng: -0.1278, verifiedSource: "https://en.wikipedia.org/wiki/2016_United_Kingdom_European_Union_membership_referendum", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Brexit_result_map.svg/280px-Brexit_result_map.svg.png", credibility: 97 },
  { title: "COVID-19 pandemic declared", date: "2020-03-11", description: "WHO declares COVID-19 outbreak a global pandemic", category: "Pandemic", location: "Global", lat: 0, lng: 0, verifiedSource: "https://en.wikipedia.org/wiki/COVID-19_pandemic", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/COVID-19_Outbreak_World_Map.svg/300px-COVID-19_Outbreak_World_Map.svg.png", credibility: 99 },
  { title: "George Floyd protests", date: "2020-05-25", description: "Death of George Floyd sparks worldwide protests against police brutality and racism", category: "Human Rights", location: "Minneapolis, Minnesota, USA", lat: 44.9778, lng: -93.2650, verifiedSource: "https://en.wikipedia.org/wiki/George_Floyd_protests", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Black_Lives_Matter_mural%2C_Washington%2C_D.C..jpg/320px-Black_Lives_Matter_mural%2C_Washington%2C_D.C..jpg", credibility: 96 },
  { title: "James Webb Space Telescope launched", date: "2021-12-25", description: "NASA launches most powerful space telescope ever built to study early universe", category: "Space", location: "French Guiana", lat: 5.2395, lng: -52.7682, verifiedSource: "https://en.wikipedia.org/wiki/James_Webb_Space_Telescope", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/JWST_spacecraft_model_2.png/220px-JWST_spacecraft_model_2.png", credibility: 97 },
  { title: "Russia invades Ukraine", date: "2022-02-24", description: "Russia launches full-scale invasion of Ukraine, triggering major international crisis", category: "War", location: "Kyiv, Ukraine", lat: 50.4501, lng: 30.5234, verifiedSource: "https://en.wikipedia.org/wiki/2022_Russian_invasion_of_Ukraine", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/2022_Russian_invasion_of_Ukraine.svg/300px-2022_Russian_invasion_of_Ukraine.svg.png", credibility: 98 },
  { title: "ChatGPT launched", date: "2022-11-30", description: "OpenAI releases ChatGPT, sparking AI revolution in mainstream technology", category: "Technology", location: "San Francisco, California, USA", lat: 37.7749, lng: -122.4194, verifiedSource: "https://en.wikipedia.org/wiki/ChatGPT", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/240px-ChatGPT_logo.svg.png", credibility: 95 },
  { title: "Turkey-Syria earthquakes", date: "2023-02-06", description: "Devastating earthquakes strike Turkey and Syria, killing over 59,000 people", category: "Environment", location: "Gaziantep, Turkey", lat: 37.0662, lng: 37.3833, verifiedSource: "https://en.wikipedia.org/wiki/2023_Turkey%E2%80%93Syria_earthquake", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/2023_Turkey-Syria_earthquake_damage_in_Hatay.jpg/300px-2023_Turkey-Syria_earthquake_damage_in_Hatay.jpg", credibility: 97 },
  { title: "Israel-Hamas war", date: "2023-10-07", description: "Hamas launches surprise attack on Israel, triggering major conflict in Gaza", category: "War", location: "Gaza Strip", lat: 31.3547, lng: 34.3088, verifiedSource: "https://en.wikipedia.org/wiki/2023_Israel%E2%80%93Hamas_war", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Gaza_Strip_map2.svg/220px-Gaza_Strip_map2.svg.png", credibility: 96 },

  // Additional diverse events for better coverage
  { title: "Great Northern War begins", date: "1700-02-22", description: "Coalition led by Russia, Denmark-Norway and Saxony-Poland attacks Swedish Empire", category: "War", location: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686, verifiedSource: "https://en.wikipedia.org/wiki/Great_Northern_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Great_Northern_War_collage.jpg/300px-Great_Northern_War_collage.jpg", credibility: 95 },
  { title: "Lisbon earthquake", date: "1755-11-01", description: "Massive earthquake and tsunami destroys Lisbon, killing 60,000-100,000 people", category: "Environment", location: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393, verifiedSource: "https://en.wikipedia.org/wiki/1755_Lisbon_earthquake", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/1755_Lisbon_earthquake.jpg/300px-1755_Lisbon_earthquake.jpg", credibility: 96 },
  { title: "Captain Cook discovers Hawaii", date: "1778-01-18", description: "Captain James Cook becomes first European to reach Hawaiian Islands", category: "Exploration", location: "Waimea, Hawaii, USA", lat: 21.9644, lng: -159.6697, verifiedSource: "https://en.wikipedia.org/wiki/James_Cook", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Captainjamescookportrait.jpg/220px-Captainjamescookportrait.jpg", credibility: 95 },
  { title: "Beethoven's 9th Symphony premiered", date: "1824-05-07", description: "Ludwig van Beethoven's Ninth Symphony premiered in Vienna to great acclaim", category: "Culture", location: "Vienna, Austria", lat: 48.2082, lng: 16.3738, verifiedSource: "https://en.wikipedia.org/wiki/Symphony_No._9_%28Beethoven%29", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Beethoven.jpg/220px-Beethoven.jpg", credibility: 96 },
  { title: "Texas independence", date: "1836-03-02", description: "Texas Declaration of Independence from Mexico signed at Convention of 1836", category: "Politics", location: "Washington-on-the-Brazos, Texas, USA", lat: 30.3144, lng: -96.1503, verifiedSource: "https://en.wikipedia.org/wiki/Texas_Declaration_of_Independence", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Flag_of_Texas.svg/255px-Flag_of_Texas.svg.png", credibility: 96 },
  { title: "Crimean War begins", date: "1853-10-16", description: "Ottoman Empire declares war on Russia, Britain and France later join", category: "War", location: "Crimea, Ukraine", lat: 45.0, lng: 34.0, verifiedSource: "https://en.wikipedia.org/wiki/Crimean_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Charge_of_the_Light_Brigade.jpg/320px-Charge_of_the_Light_Brigade.jpg", credibility: 95 },
  { title: "Suez Canal opens", date: "1869-11-17", description: "Suez Canal officially opens, connecting Mediterranean Sea to Red Sea", category: "Technology", location: "Suez, Egypt", lat: 29.9668, lng: 32.5498, verifiedSource: "https://en.wikipedia.org/wiki/Suez_Canal", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Suez_Canal.jpeg/280px-Suez_Canal.jpeg", credibility: 97 },
  { title: "First modern Olympics", date: "1896-04-06", description: "First modern Olympic Games held in Athens, Greece", category: "Sports", location: "Athens, Greece", lat: 37.9838, lng: 23.7275, verifiedSource: "https://en.wikipedia.org/wiki/1896_Summer_Olympics", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Panathenaic_stadium_in_Athens.JPG/320px-Panathenaic_stadium_in_Athens.JPG", credibility: 96 },
  { title: "Boxer Rebellion", date: "1900-06-20", description: "Anti-foreign uprising in China targets Christian missionaries and foreigners", category: "War", location: "Beijing, China", lat: 39.9042, lng: 116.4074, verifiedSource: "https://en.wikipedia.org/wiki/Boxer_Rebellion", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Boxer_Rebellion.jpg/300px-Boxer_Rebellion.jpg", credibility: 95 },
  { title: "Panama Canal opens", date: "1914-08-15", description: "Panama Canal officially opens, connecting Atlantic and Pacific oceans", category: "Technology", location: "Panama City, Panama", lat: 8.9824, lng: -79.5199, verifiedSource: "https://en.wikipedia.org/wiki/Panama_Canal", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Panama_Canal_Gatun_Locks.jpg/300px-Panama_Canal_Gatun_Locks.jpg", credibility: 97 },
  { title: "Chinese Revolution", date: "1949-10-01", description: "Mao Zedong declares establishment of People's Republic of China", category: "Politics", location: "Beijing, China", lat: 39.9042, lng: 116.4074, verifiedSource: "https://en.wikipedia.org/wiki/Chinese_Communist_Revolution", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Mao_Zedong_portrait.jpg/220px-Mao_Zedong_portrait.jpg", credibility: 98 },
  { title: "Rosa Parks refuses to give up seat", date: "1955-12-01", description: "Rosa Parks' refusal to give up bus seat sparks Montgomery Bus Boycott", category: "Human Rights", location: "Montgomery, Alabama, USA", lat: 32.3668, lng: -86.2999, verifiedSource: "https://en.wikipedia.org/wiki/Rosa_Parks", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/Rosaparks.jpg/220px-Rosaparks.jpg", credibility: 98 },
  { title: "Six-Day War", date: "1967-06-05", description: "Israel defeats Egypt, Jordan and Syria in six-day conflict", category: "War", location: "Jerusalem, Israel", lat: 31.7683, lng: 35.2137, verifiedSource: "https://en.wikipedia.org/wiki/Six-Day_War", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Six_Day_War_Territories.svg/280px-Six_Day_War_Territories.svg.png", credibility: 97 },
  { title: "Roe v. Wade decision", date: "1973-01-22", description: "US Supreme Court rules on abortion rights in landmark Roe v. Wade case", category: "Human Rights", location: "Washington, D.C., USA", lat: 38.9072, lng: -77.0369, verifiedSource: "https://en.wikipedia.org/wiki/Roe_v._Wade", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Supreme_Court_Front_Dusk.jpg/280px-Supreme_Court_Front_Dusk.jpg", credibility: 97 },
  { title: "Personal computer revolution", date: "1977-04-16", description: "Apple II computer introduced, beginning personal computer revolution", category: "Technology", location: "Cupertino, California, USA", lat: 37.3230, lng: -122.0322, verifiedSource: "https://en.wikipedia.org/wiki/Apple_II", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Apple_II_tranparent_800.png/220px-Apple_II_tranparent_800.png", credibility: 95 },
  { title: "Mount St. Helens eruption", date: "1980-05-18", description: "Volcanic eruption of Mount St. Helens kills 57 people in Washington state", category: "Environment", location: "Skamania County, Washington, USA", lat: 46.1914, lng: -122.1956, verifiedSource: "https://en.wikipedia.org/wiki/1980_eruption_of_Mount_St._Helens", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/MSH80_st_helens_plume_from_harrys_ridge_05-19-80.jpg/280px-MSH80_st_helens_plume_from_harrys_ridge_05-19-80.jpg", credibility: 96 },
  { title: "Space Shuttle Challenger disaster", date: "1986-01-28", description: "Space Shuttle Challenger breaks apart 73 seconds after launch, killing all seven crew", category: "Space", location: "Cape Canaveral, Florida, USA", lat: 28.5729, lng: -80.6490, verifiedSource: "https://en.wikipedia.org/wiki/Space_Shuttle_Challenger_disaster", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Challenger_explosion.jpg/280px-Challenger_explosion.jpg", credibility: 98 },
  { title: "Tiananmen Square protests", date: "1989-06-04", description: "Chinese military crushes pro-democracy protests in Tiananmen Square", category: "Human Rights", location: "Beijing, China", lat: 39.9042, lng: 116.4074, verifiedSource: "https://en.wikipedia.org/wiki/1989_Tiananmen_Square_protests_and_massacre", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tiananmen_Square%2C_Beijing%2C_China_1988_%281%29.jpg/300px-Tiananmen_Square%2C_Beijing%2C_China_1988_%281%29.jpg", credibility: 96 },
  { title: "Rwanda genocide", date: "1994-04-07", description: "Genocide in Rwanda kills an estimated 500,000-1,000,000 Tutsi people", category: "War", location: "Kigali, Rwanda", lat: -1.9536, lng: 30.0606, verifiedSource: "https://en.wikipedia.org/wiki/Rwandan_genocide", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Nyamata_Memorial_Site_13.jpg/280px-Nyamata_Memorial_Site_13.jpg", credibility: 97 },
  { title: "Dolly the sheep cloned", date: "1996-07-05", description: "Dolly becomes first mammal cloned from adult somatic cell", category: "Science", location: "Edinburgh, Scotland", lat: 55.9533, lng: -3.1883, verifiedSource: "https://en.wikipedia.org/wiki/Dolly_%28sheep%29", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Dolly_face_closeup.jpg/220px-Dolly_face_closeup.jpg", credibility: 97 },
  { title: "Princess Diana dies", date: "1997-08-31", description: "Diana, Princess of Wales, dies in car crash in Paris tunnel", category: "Culture", location: "Paris, France", lat: 48.8566, lng: 2.3522, verifiedSource: "https://en.wikipedia.org/wiki/Death_of_Diana,_Princess_of_Wales", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Diana%2C_Princess_of_Wales_1997_%282%29.jpg/220px-Diana%2C_Princess_of_Wales_1997_%282%29.jpg", credibility: 98 },
  { title: "Euro currency introduced", date: "1999-01-01", description: "Euro becomes official currency of European Union member states", category: "Economy", location: "Frankfurt, Germany", lat: 50.1109, lng: 8.6821, verifiedSource: "https://en.wikipedia.org/wiki/Euro", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Euro_symbol_gold.svg/170px-Euro_symbol_gold.svg.png", credibility: 96 },
  { title: "Hurricane Katrina", date: "2005-08-29", description: "Category 5 hurricane devastates New Orleans and Gulf Coast, killing 1,800+", category: "Environment", location: "New Orleans, Louisiana, USA", lat: 29.9511, lng: -90.0715, verifiedSource: "https://en.wikipedia.org/wiki/Hurricane_Katrina", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Katrina-noaaGOES12.jpg/240px-Katrina-noaaGOES12.jpg", credibility: 97 },
  { title: "Haiti earthquake", date: "2010-01-12", description: "Magnitude 7.0 earthquake strikes Haiti, killing over 200,000 people", category: "Environment", location: "Port-au-Prince, Haiti", lat: 18.5944, lng: -72.3074, verifiedSource: "https://en.wikipedia.org/wiki/2010_Haiti_earthquake", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2010_earthquake_damaged_Port-au-Prince.jpg/300px-2010_earthquake_damaged_Port-au-Prince.jpg", credibility: 97 },
  { title: "Osama bin Laden killed", date: "2011-05-02", description: "Al-Qaeda leader Osama bin Laden killed by US forces in Pakistan", category: "War", location: "Abbottabad, Pakistan", lat: 34.1495, lng: 73.2131, verifiedSource: "https://en.wikipedia.org/wiki/Death_of_Osama_bin_Laden", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Osama_bin_Laden_portrait.jpg/220px-Osama_bin_Laden_portrait.jpg", credibility: 97 },
  { title: "Syrian Civil War begins", date: "2011-03-15", description: "Peaceful protests in Syria escalate into full-scale civil war", category: "War", location: "Damascus, Syria", lat: 33.5138, lng: 36.2765, verifiedSource: "https://en.wikipedia.org/wiki/Syrian_civil_war", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Syrian_civil_war.png/300px-Syrian_civil_war.png", credibility: 96 },
  { title: "Ebola outbreak", date: "2014-03-25", description: "Major Ebola epidemic begins in West Africa, killing over 11,000 people", category: "Pandemic", location: "Guinea", lat: 9.9456, lng: -9.6966, verifiedSource: "https://en.wikipedia.org/wiki/Western_African_Ebola_virus_epidemic", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Ebola_virus_virion.jpg/220px-Ebola_virus_virion.jpg", credibility: 97 },
  { title: "Notre-Dame fire", date: "2019-04-15", description: "Major fire damages Notre-Dame Cathedral in Paris", category: "Culture", location: "Paris, France", lat: 48.8530, lng: 2.3499, verifiedSource: "https://en.wikipedia.org/wiki/Notre-Dame_de_Paris_fire", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Incendie_Notre-Dame_de_Paris.jpg/280px-Incendie_Notre-Dame_de_Paris.jpg", credibility: 96 },
  { title: "Afghanistan withdrawal", date: "2021-08-30", description: "US completes military withdrawal from Afghanistan, ending 20-year war", category: "War", location: "Kabul, Afghanistan", lat: 34.5553, lng: 69.2075, verifiedSource: "https://en.wikipedia.org/wiki/Withdrawal_of_United_States_troops_from_Afghanistan_(2020%E2%80%932021)", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/US_Air_Force_C-17_at_Kabul_airport_in_August_2021.jpg/300px-US_Air_Force_C-17_at_Kabul_airport_in_August_2021.jpg", credibility: 96 },
  { title: "Queen Elizabeth II dies", date: "2022-09-08", description: "Queen Elizabeth II dies at age 96 after 70-year reign", category: "Politics", location: "Balmoral Castle, Scotland", lat: 57.0395, lng: -3.2305, verifiedSource: "https://en.wikipedia.org/wiki/Death_and_state_funeral_of_Elizabeth_II", imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Queen_Elizabeth_II_in_March_2015.jpg/220px-Queen_Elizabeth_II_in_March_2015.jpg", credibility: 98 },
];

/**
 * Seed events in batches
 */
async function seedEvents() {
  const BATCH_SIZE = 50;
  let totalSaved = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  log(colors.cyan, '\n════════════════════════════════════════════════════════════');
  log(colors.cyan, '🌍 GLOBAL HISTORY SEEDER');
  log(colors.cyan, '════════════════════════════════════════════════════════════\n');

  log(colors.yellow, `📊 Total events to seed: ${GLOBAL_EVENTS.length}`);
  log(colors.yellow, `📦 Batch size: ${BATCH_SIZE}\n`);

  // Process in batches
  for (let i = 0; i < GLOBAL_EVENTS.length; i += BATCH_SIZE) {
    const batch = GLOBAL_EVENTS.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(GLOBAL_EVENTS.length / BATCH_SIZE);

    log(colors.cyan, `\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} events)...`);

    const batchWrites = [];
    let batchSaved = 0;
    let batchSkipped = 0;

    for (const event of batch) {
      try {
        const urlHash = generateUrlHash(event.title, event.date);
        const eventRef = db.collection('events').doc(urlHash);

        // Check if event already exists
        const existingDoc = await eventRef.get();
        
        if (existingDoc.exists) {
          log(colors.gray, `   ⏭️  Skipped: ${event.title.substring(0, 60)}...`);
          batchSkipped++;
          totalSkipped++;
          continue;
        }

        // Prepare event data
        const eventData = {
          ...event,
          urlHash,
          createdAt: new Date(),
          updatedAt: new Date(),
          addedBy: 'system@realtea.seed',
          isBreaking: false,
        };

        // Write to Firestore
        batchWrites.push(
          eventRef.set(eventData, { merge: true })
        );

        log(colors.green, `   ✅ Added: ${event.title.substring(0, 60)}... (${event.date})`);
        batchSaved++;
        totalSaved++;

      } catch (error) {
        log(colors.red, `   ❌ Error: ${event.title.substring(0, 60)}... - ${error.message}`);
        totalErrors++;
      }
    }

    // Execute batch writes
    if (batchWrites.length > 0) {
      try {
        await Promise.all(batchWrites);
        log(colors.green, `\n✅ Batch ${batchNumber} complete: ${batchSaved} saved, ${batchSkipped} skipped`);
      } catch (error) {
        log(colors.red, `\n❌ Batch ${batchNumber} error: ${error.message}`);
      }
    }

    // Delay between batches to avoid rate limits
    if (i + BATCH_SIZE < GLOBAL_EVENTS.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Final summary
  log(colors.cyan, '\n════════════════════════════════════════════════════════════');
  log(colors.green, '✅ SEEDING COMPLETE');
  log(colors.cyan, '════════════════════════════════════════════════════════════\n');
  log(colors.green, `   ✅ Saved: ${totalSaved}`);
  log(colors.yellow, `   ⏭️  Skipped: ${totalSkipped}`);
  if (totalErrors > 0) {
    log(colors.red, `   ❌ Errors: ${totalErrors}`);
  }
  log(colors.cyan, '\n════════════════════════════════════════════════════════════\n');

  return { saved: totalSaved, skipped: totalSkipped, errors: totalErrors };
}

// Run seeder
seedEvents()
  .then(result => {
    log(colors.green, `🎉 Done! ${result.saved} events added to Firestore.`);
    process.exit(0);
  })
  .catch(error => {
    log(colors.red, `❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });

