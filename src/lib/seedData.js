import { db } from "./firebase";
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

const EVENTS_COLLECTION = "events";

export const sampleEvents = [
  {
    title: "First Moon Landing",
    date: "1969-07-20",
    location: "Moon",
    category: "Science",
    verifiedSource: "https://www.nasa.gov/mission_pages/apollo/apollo11.html",
    description: "Neil Armstrong and Buzz Aldrin became the first humans to walk on the Moon during NASA's Apollo 11 mission. Armstrong's famous words 'That's one small step for man, one giant leap for mankind' marked a pivotal moment in human history and the Space Race.",
    imageUrl: "",
    addedBy: "system@realtea.com",
    author: "system@realtea.com",
  },
  {
    title: "Fall of the Berlin Wall",
    date: "1989-11-09",
    location: "Berlin, Germany",
    category: "Politics",
    verifiedSource: "https://www.history.com/topics/cold-war/berlin-wall",
    description: "The Berlin Wall, which had divided East and West Berlin since 1961, was opened after mounting pressure from East German citizens. This event symbolized the end of the Cold War and led to German reunification.",
    imageUrl: "",
    addedBy: "system@realtea.com",
    author: "system@realtea.com",
  },
  {
    title: "COVID-19 Declared Pandemic",
    date: "2020-03-11",
    location: "Global",
    category: "Other",
    verifiedSource: "https://www.who.int/director-general/speeches/detail/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020",
    description: "The World Health Organization declared COVID-19 a global pandemic as the coronavirus spread to over 100 countries. This declaration marked the beginning of unprecedented global health measures and societal changes.",
    imageUrl: "",
    addedBy: "system@realtea.com",
    author: "system@realtea.com",
  },
  {
    title: "Internet Becomes Public",
    date: "1993-08-06",
    location: "World Wide Web",
    category: "Technology",
    verifiedSource: "https://home.cern/science/computing/birth-web",
    description: "CERN made the World Wide Web technology freely available to everyone, releasing it into the public domain. This decision paved the way for the explosive growth of the internet and transformed global communication.",
    imageUrl: "",
    addedBy: "system@realtea.com",
    author: "system@realtea.com",
  },
  {
    title: "First Human Heart Transplant",
    date: "1967-12-03",
    location: "Cape Town, South Africa",
    category: "Science",
    verifiedSource: "https://www.thelancet.com/journals/lancet/article/PIIS0140-6736(67)92874-4/fulltext",
    description: "Dr. Christiaan Barnard performed the world's first successful human-to-human heart transplant at Groote Schuur Hospital. The patient, Louis Washkansky, survived for 18 days, proving the procedure's viability and revolutionizing cardiac medicine.",
    imageUrl: "",
    addedBy: "system@realtea.com",
    author: "system@realtea.com",
  },
];

export async function seedEventsIfEmpty() {
  if (!db) {
    console.log("Database not initialized, skipping seed");
    return false;
  }

  try {
    // Check if events collection is empty
    const eventsRef = collection(db, EVENTS_COLLECTION);
    const snapshot = await getDocs(eventsRef);
    
    if (snapshot.empty) {
      console.log("Events collection is empty. Seeding with sample data...");
      
      // Add each sample event
      const promises = sampleEvents.map(event => 
        addDoc(eventsRef, {
          ...event,
          sources: event.verifiedSource ? [event.verifiedSource] : [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
      
      await Promise.all(promises);
      console.log(`✅ Successfully seeded ${sampleEvents.length} events`);
      return true;
    } else {
      console.log(`Events collection already has ${snapshot.size} events, skipping seed`);
      return false;
    }
  } catch (error) {
    console.error("Error seeding events:", error);
    return false;
  }
}

