LLM Usage Report
1. Handling Missing Station Data with a Fallback System

  Problem Identified in Results: While testing the application, we found that certain stations caused the app to crash or display empty charts. This happened because those stations were listed in the map coordinate file (station_info.csv) but did not have any matching passenger data in passenger_summary.json.
  
  Brainstorming & LLM Prompting: To prevent the UI from breaking, we decided to create a fallback system. We thought about using hardcoded default values (like an average hourly passenger graph and standard age ratios) whenever a station's data was missing. We asked the LLM how to cleanly write a conditional check during the data-merging phase to apply these defaults.
  
  Review & Implementation: We reviewed the LLM's code, which used a simple ternary operator to detect missing data and fill it with fallback constants like FALLBACK_HOURLY. We implemented this code into loaders.js, and now the app runs safely without crashing.

2. Automatic Map View Adjustment for Filtered Stations

  Problem Identified in Results: We noticed a bad user experience when applying filters (like selecting a specific subway line or passenger type). Sometimes, all the matching stations were completely off-screen, forcing the user to manually drag and zoom around the map just to find where they were.
  
  Brainstorming & LLM Prompting: We realized that the map should automatically move to the correct area whenever the filters change. We thought about tracking the coordinates of the visible stations and using Kakao Map's centering functions (panTo or setCenter) inside a React useEffect hook. We prompted the LLM to generate a function that calculates the center point of the filtered stations and moves the map smoothly.
  
  Review & Implementation: We checked the LLM's implementation to ensure it correctly accessed the map instance and handled the latitude and longitude updates without causing infinite rerender loops. We integrated the suggested map-moving logic into our main view components, making the map respond instantly to filter changes.

3. Dynamic "Local Top" Ranking Based on Map Zoom and Viewport

  Problem Identified in Results: When a user zoomed in on the map, the number of visible stations on the screen naturally decreased. However, the ranking sidebar still showed the "global" top stations of the entire city. Since those top stations were now off-screen, the ranking list became useless for the specific area the user was looking at.
  
  Brainstorming & LLM Prompting: We realized we needed a "local top" system that dynamically updates based on the map's zoom level and boundaries. We brainstormed a way to capture the current map viewport bounds and filter out only the stations currently visible on the screen, then sort them by passenger count. We prompted the LLM to help us write an efficient sorting logic that updates in real-time whenever the map boundaries change.
  
  Review & Implementation: We reviewed the LLM's suggested approach, making sure it used map event listeners (like zoom or bounds changes) efficiently without causing performance lag. We implemented this local ranking algorithm, so the dashboard now successfully highlights the top peak stations inside the user's current zoomed-in view.

4. Code Refactoring for Better Readability and Removing Unnecessary Props

  Problem Identified in Results: As we kept adding more features, App.jsx became extremely long and messy. We noticed that some components were passing down way too many props that they didn't even use (prop drilling), which made the code really hard to read and follow during debugging.
  
  Brainstorming & LLM Prompting: We realized we needed to clean up the code to make it readable for the final submission. We brainstormed which props were actually necessary and how to structure them better. We pasted our cluttered component code into the LLM and asked it to identify unused props, simplify the component data flow, and clean up the overall formatting for better readability.
  
  Review & Implementation: We carefully reviewed the refactored code from the LLM to make sure it didn't accidentally break any of our state connections or data flows. After confirming everything was safe, we applied the cleaner code, which made our project much more organized and easier to maintain.
