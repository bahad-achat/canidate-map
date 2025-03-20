const BASE_CORDS = [30.65093635405422, 34.79744931815025];
const map = L.map("map").setView([31.5, 34.8], 8);

const initMap = async () => {
  L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "מפת צוער",
  }).addTo(map);

  const osmb = new OSMBuildings(map).load(
    "https://{s}.data.osmbuildings.org/0.2/59fcc2e8/tile/{z}/{x}/{y}.json"
  );

  const homeIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="30" height="30">
        <path d="M32 12L4 36h8v16h16V40h8v12h16V36h8z" fill="#2196F3" stroke="#fff" stroke-width="2"/>
    </svg>
`;

  L.marker(BASE_CORDS, {
    icon: L.divIcon({
      className: "custom-marker",
      html: `<div style="width: 30px; height: 30px;">${homeIconSvg}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    }),
  })
    .addTo(map)
    .bindPopup("Random Home Location");

  await dynamicMap();
  setInterval(dynamicMap, 30000);
};

const dynamicMap = async () => {
  const schools = await getSchoolsFromExcel();
  let requestCount = 0;

  for (const school of schools) {
    const cords = await getCordsFromAddress(school.address);
    requestCount++;

    if (cords && cords.length > 0) {
      addMarker(cords, school);
      let line;
      const drawDashedLine = () => {
        if (line) {
          map.removeLayer(line);
        }
        line = L.polyline([BASE_CORDS, cords], {
          color: "blue",
          dashArray: "5, 10",
        }).addTo(map);
      };

      drawDashedLine();
    }

    if (requestCount % 10 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
};

const getSchoolsFromExcel = async () => {
  const SHEET_ID = "12ybJ95qvf7iFdgLbaP4NK4MVxEsPaXsEonWcbd0WhGA";
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`
    );
    const text = await response.text();

    // Remove Google's extra characters (/*O_o*/)
    const jsonText = text.substring(text.indexOf("{"), text.length - 2);
    const json = JSON.parse(jsonText);

    const schools = json.table.rows.map((row) => {
      return {
        serial: row.c[0]?.v || null,
        schoolName: row.c[1]?.v || null,
        address: row.c[2]?.v || null,
        status: row.c[3]?.v || null,
      };
    });

    return schools;
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
  }
};

const getCordsFromAddress = async (address) => {
  if (address === null) return;
  const api_key = "350683306027412334908x616";
  const url = `https://geocode.xyz/${encodeURIComponent(address)}?json=1&auth=${encodeURIComponent(
    api_key
  )}`;

  const response = await getData(url);

  try {
    if (response && !response.error) {
      return [response.latt, response.longt];
    } else {
      console.error("No results for " + address);
    }
  } catch (error) {
    console.error("Error fetching data", error);
  }
};

const getData = async (url) => (await fetch(url)).json();
const addMarker = (cords, school) => {
  let statusColor = "green";

  if (school.status === "טרם יצאנו") {
    statusColor = "red";
  } else if (school.status === "בדרך") {
    statusColor = "yellow";
  } else if (school.status === "בדרך חזרה") {
    statusColor = "blue";
  }

  L.marker(cords, {
    icon: L.divIcon({
      className: "custom-marker",
      html: `<div style="background-color: ${statusColor}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    }),
  })
    .addTo(map)
    .bindPopup(
      `<div class="school-popup">בית ספר: ${school.schoolName}<br>שנמצא בכתובת: ${school.address}<br>סטטוס: ${school.status}<br> מאוייש על ידי חוליה מספר ${school.serial}</div>`
    );
};

initMap();
