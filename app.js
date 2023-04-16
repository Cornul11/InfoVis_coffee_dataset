const geoDataURL = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

// set the dimensions of the chart
const margin = {top: 20, right: 20, bottom: 30, left: 40}, width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const sliderFields = {
    "Fragrance...Aroma": "fragrance-aroma",
    "Flavor": "flavor",
    "Aftertaste": "aftertaste",
    "Salt...Acid": "salt-acid",
    "Bitter...Sweet": "bitter-sweet",
    "Mouthfeel": "mouthfeel",
    "Uniform.Cup": "uniform-cup",
    "Clean.Cup": "clean-cup",
    "Balance": "balance",
    "Cupper.Points": "cupper-points",
    "Total.Cup.Points": "total-cup-points-big"
};

const sliders = {};


Object.entries(sliderFields).forEach(([field, elementId]) => {
    const rangeMax = field === "Total.Cup.Points" ? 100 : 10;
    const sliderElement = document.getElementById(elementId);

    noUiSlider.create(sliderElement, {
        start: [0, rangeMax],
        connect: true,
        step: 0.1,
        range: {
            'min': 0,
            'max': rangeMax
        },
        pips: {
            mode: 'count',
            values: '10',
            density: '2'
        }
    });


    sliders[field] = sliderElement;
});

// Create and configure the range slider
const totalCupPointsSlider = document.getElementById('total-cup-points');
noUiSlider.create(totalCupPointsSlider, {
    start: ['20.0', '90.0'], // Initial handles position
    connect: true, // Connects the handles
    step: 1, // Slider step value
    range: {
        'min': 0,
        'max': 100
    },
    tooltips: {
        to: function (numericValue) {
            return numericValue.toFixed(1);
        }
    },
    pips: {
        mode: 'steps',
        density: 10,
        filter: (value, type) => {
            // Show only the pips for specific values (in this case, every 10 points)
            if (value % 10 === 0) {
                return 1;
            }
            return 0;
        },
        format: {
            to: value => value.toFixed(0),
            from: value => parseFloat(value)
        }
    }
});


// set the ranges
const x = d3.scaleBand()
    .range([0, width])
    .padding(0.1);
const y = d3.scaleLinear()
    .range([height, 0]);

// load the data from CSV then do stuff with it
d3.csv("merged_cleanedv1.csv").then(function (data) {

    const xScatter = d3.scaleLinear().range([0, width]);
    const yScatter = d3.scaleLinear().range([height, 0]);

    const svgScatter = d3.select("#chart2")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    const xAxisScatter = d3.axisBottom(xScatter);
    const yAxisScatter = d3.axisLeft(yScatter);

    const xAxisGScatter = svgScatter.append("g")
        .attr("transform", "translate(0," + height + ")");
    const yAxisGScatter = svgScatter.append("g");

    function updateScatterPlot(data) {
        xScatter.domain([0, 100]);
        yScatter.domain([0, d3.max(data, d => +d['altitude_mean_meters'])]);

        // Define color scale for the two species
        const colorScale = d3.scaleOrdinal()
            .domain(['Arabica', 'Robusta'])
            .range(['orange', 'green']);

        // Update circles with species-based colors
        const circles = svgScatter.selectAll("circle")
            .data(data, d => d.id);

        circles.enter()
            .append("circle")
            .attr("cx", d => xScatter(+d['Total.Cup.Points']))
            .attr("cy", d => yScatter(+d['altitude_mean_meters']))
            .attr("r", 3)
            .attr("fill", d => colorScale(d['Species']));

        circles
            .attr("cx", d => xScatter(+d['Total.Cup.Points']))
            .attr("cy", d => yScatter(+d['altitude_mean_meters']))
            .attr("fill", d => colorScale(d['Species']));

        circles.exit().remove();

        xAxisGScatter.call(xAxisScatter);
        yAxisGScatter.call(yAxisScatter);

        // Add legend
        const legend = svgScatter.append("g")
            .attr("transform", `translate(${width - 100},${height - 50})`);

        const legendData = legend.selectAll("g")
            .data(colorScale.domain())
            .enter()
            .append("g")
            .attr("transform", (d, i) => `translate(0,${i * 20})`);

        legendData.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", colorScale);

        legendData.append("text")
            .attr("x", 20)
            .attr("y", 10)
            .attr("dy", "0.35em")
            .text(d => d);
    }

    const processingMethodSelect = d3.select("#processing-method").classed("selectized-input", true);
    const harvestYearSelect = d3.select("#harvest-year");
    const countrySelect = d3.select("#country").classed("selectized-input", true);

    d3.csv("merged_cleanedv1.csv").then(function (data) {
        data.forEach((d, i) => d.id = i);

        // Populate dropdowns with unique values
        const processingMethods = Array.from(new Set(data.map(d => d['Processing.Method'].trim())));
        const harvestYears = Array.from(new Set(data.map(d => d['Harvest.Year']))).sort((a, b) => a - b);
        const countries = Array.from(new Set(data.map(d => d['Country.of.Origin'])));

        processingMethodSelect.selectAll("option")
            .data(processingMethods)
            .enter().append("option")
            .attr("value", d => d)
            .text(d => d);

        const processingMethodTomSelect = new TomSelect('#processing-method');

        harvestYearSelect.selectAll("option")
            .data(harvestYears)
            .enter().append("option")
            .attr("value", d => d)
            .text(d => d);

        countrySelect.selectAll("option")
            .data(countries)
            .enter().append("option")
            .attr("value", d => d)
            .text(d => d);

        const countryTomSelect = new TomSelect('#country');

        updateScatterPlot(data);

        processingMethodSelect.on("change", function () {
            applyFilters();
        });
        harvestYearSelect.on("change", function () {
            applyFilters();
        });
        countrySelect.on("change", function () {
            applyFilters();
        });

        // Function to apply filters and update scatter plot
        function applyFilters() {
            const selectedProcessingMethods = processingMethodTomSelect.getValue();
            const selectedHarvestYear = harvestYearSelect.property("value");
            const selectedCountries = countryTomSelect.getValue();

            // Filter for the scatterplot
            const totalCupPointsRange = totalCupPointsSlider.noUiSlider.get().map(parseFloat);
            const filteredDataScatter = data.filter(d => {
                return parseFloat(d['Total.Cup.Points']) >= totalCupPointsRange[0] &&
                    parseFloat(d['Total.Cup.Points']) <= totalCupPointsRange[1] &&
                    (selectedProcessingMethods.includes("all") || selectedProcessingMethods.includes(d['Processing.Method'])) &&
                    (selectedHarvestYear === "all" || d['Harvest.Year'] === selectedHarvestYear) &&
                    (selectedCountries.includes("all") || selectedCountries.includes(d['Country.of.Origin']));
            });


            updateScatterPlot(filteredDataScatter);
            displayCoffeeBeansList(filteredDataScatter);

            // Filter for the heatmap
            const filteredDataHeatmap = data.filter(d => {
                const result = Object.entries(sliderFields).every(([field, elementId]) => {
                    const range = sliders[field].noUiSlider.get().map(parseFloat);
                    return parseFloat(d[field]) >= range[0] && parseFloat(d[field]) <= range[1];
                });
                return result;
            });

            processData(filteredDataHeatmap);

            // Process the data for the second heatmap
            const aggregatedData = filteredDataHeatmap.reduce((accumulator, bean) => {
                const country = bean["Country.of.Origin"];
                accumulator[country] = (accumulator[country] || 0) + 1;
                return accumulator;
            }, {});

            createSecondHeatmap(aggregatedData);
        }


        function displayCoffeeBeansList(coffeeBeans) {
            const listContainer = d3.select('#coffee-beans-list');
            listContainer.html(''); // Clear the previous list

            // very ugly but don't know how to do it else
            coffeeBeans.forEach(bean => {
                const listItem = listContainer.append('div').attr('class', 'list-group-item');
                listItem.append('h3').text(bean['Mill']);
                listItem.append('p').html(`<strong>Producer:</strong> ${bean['Producer']}`);
                listItem.append('p').html(`<strong>Variety:</strong> ${bean['Variety']}`);
                listItem.append('p').html(`<strong>Species:</strong> ${bean['Species']}`);
                listItem.append('p').html(`<strong>Country of Origin:</strong> ${bean['Country.of.Origin']}`);
                listItem.append('p').html(`<strong>Processing Method:</strong> ${bean['Processing.Method']}`);
                listItem.append('p').html(`<strong>Total Cup Points:</strong> ${bean['Total.Cup.Points']}`);
            });
        }

        Object.entries(sliderFields).forEach(([field, elementId]) => {
            const sliderElement = document.getElementById(elementId);

            sliderElement.noUiSlider.on('change', () => {
                applyFilters();
            });
        });

        totalCupPointsSlider.noUiSlider.on('change', () => {
            applyFilters();
        });
    });
});

async function loadData() {
    const coffeeBeansData = await d3.csv("merged_cleanedv1.csv");
    processData(coffeeBeansData);
}

function processData(coffeeBeansData) {
    // Return early if no data is provided
    if (!coffeeBeansData || coffeeBeansData.length === 0) {
        return;
    }

    const aggregatedData = coffeeBeansData.reduce((accumulator, bean) => {
        const country = bean["Country.of.Origin"];
        accumulator[country] = (accumulator[country] || 0) + 1;
        return accumulator;
    }, {});

    createSecondHeatmap(aggregatedData);
}
// the workflow is janky but it works
loadData();

async function createSecondHeatmap(aggregatedData) {
    const width = 960;
    const height = 480;
    const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([1, d3.max(Object.values(aggregatedData))]);

    // Clear the previous heatmap if any
    d3.select("#heatmap2").select("svg").remove();

    if (Object.keys(aggregatedData).length === 0) {
        // If there is no aggregated data, display "NO DATA" message over the heatmap
        const heatmapContainer = document.getElementById('heatmap2');
        let noDataContainer = heatmapContainer.querySelector('.no-data-container');
        if (!noDataContainer) {
            noDataContainer = document.createElement('div');
            noDataContainer.classList.add('no-data-container');
            heatmapContainer.appendChild(noDataContainer);
        }
        noDataContainer.innerHTML = '<div class="no-data">NO DATA<br />CHECK FILTERS</div>';
        return;
    }

    // If there is aggregated data, remove any existing "NO DATA" message
    const noDataContainer = document.querySelector('#heatmap2 .no-data-container');
    if (noDataContainer) {
        noDataContainer.remove();
    }

    const svg = d3.select("#heatmap2")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoEquirectangular().fitSize([width, height], {type: "Sphere"});
    const path = d3.geoPath().projection(projection);

    const geoJSON = await d3.json(geoDataURL);
    const countries = topojson.feature(geoJSON, geoJSON.objects.countries).features;

    svg.selectAll("path")
        .data(countries)
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => {
            const country = d.properties.name;
            const count = aggregatedData[country] || 0;
            return count === 0 ? "white" : colorScale(count);
        })
        .attr("stroke", "black")
        .attr("stroke-width", 0.5);
}
