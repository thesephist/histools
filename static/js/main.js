const {
	Component,
	Record,
	Store,
} = window.Torus;

let FIRST_TIME = Infinity;
let LAST_TIME = -Infinity;
let DURATION = 1;
let HEATMAP_SPAN_DAYS = 32; // a month, with some buffer
let HISTOGRAM_RESOLUTION = 50;

async function fetchHistoryItems() {
	const fetchedHistItems = await fetch('/data.json').then(resp => resp.json());
	const histItems = [];
	for (let i = 0;; i ++) {
		if (i in fetchedHistItems) {
			histItems.push(fetchedHistItems[i]);

            const timestamps = Object.keys(fetchedHistItems[i].visits).map(n => +n).sort();
            if (FIRST_TIME > timestamps[0]) {
                FIRST_TIME = timestamps[0];
            }
            if (LAST_TIME < timestamps[timestamps.length - 1]) {
                LAST_TIME = timestamps[timestamps.length - 1];
            }
		} else {
			break;
		}
	}
    for (const item of histItems) {
        item.visit_count = +item.visit_count;
    }
    histItems.sort((a, b) => {
		// sort in visit_count desc
		if (a.visit_count > b.visit_count) return -1;
		if (a.visit_count < b.visit_count) return 1;
		return 0;
	});
    DURATION = LAST_TIME - FIRST_TIME;
    return histItems;
}

function HistItem({
	url,
	visits,
	visit_count,
}) {
	let title = '(unknown)'
	const visitTimes = Object.keys(visits);
	if (visitTimes.length) {
		title = visits[visitTimes[0]];
	}

	return jdom`<div class="visit paper">
        <div class="visit-count">${visit_count}</div>
		<div class="visit-title">${title || '(unknown)'}</div>
		<div class="visit-url">
            <a href=${url} target="_blank">
                <code>${url}</code>
            </a>
        </div>
        <div class="visit-histogram">
            ${new Array(HISTOGRAM_RESOLUTION).fill(0).map((_, day) => {
                const lo = day * (DURATION / HISTOGRAM_RESOLUTION) + FIRST_TIME;
                const hi = (day + 1) * (DURATION / HISTOGRAM_RESOLUTION) + FIRST_TIME;
                return visitTimes.filter(time => lo < +time && +time < hi).length;
            }).map(count => jdom`<div class="histo"
                title="${count} visits"
                style="opacity:${Math.sqrt(count/24)}">
            </div>`)}
        </div>
	</div>`;
}

class Dashboard extends Component {
	init() {
		this.search = '';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');

		this.histItems = [];
		fetchHistoryItems().then(data => {
			this.histItems = data;
			this.render();
		});
	}
    renderHeatmap() {
        requestAnimationFrame(() => {
            const ctx = this.ctx;
            const {width, height} = this.canvas.getBoundingClientRect();
            const day_increment = height / 32;
            const minute_increment = width / 86400;

            // TODO: thing.
            const drawDay = dayNumber => {

            }
            const drawMinute = minuteNumber => {

            }
        });
    }
	compose() {
		const loweredSearch = this.search.toLowerCase();
		const searchedItems = this.histItems.filter(item => item.url.toLowerCase().includes(loweredSearch));

        this.renderHeatmap();

		return jdom`<div class="dashboard">
			<div class="heatmap">
                ${this.canvas}
			</div>
			<div class="sidebar">
				<div class="searchbar">
					<input type="text"
						class="paper"
                        placeholder="Search urls..."
						value=${this.search}
                        autofocus
						oninput=${evt => {
							this.search = evt.target.value;
							this.render();
						}}/>
				</div>
				<div class="visits">
					${searchedItems.slice(0, 100).map(HistItem)}
				</div>
			</div>
		</div>`;
	}
}

class App extends Component {
	init() {
		this.dashboard = new Dashboard();
	}
	compose() {
		return jdom`<div class="app">
			<header class="accent paper">Histools</header>
			${this.dashboard.node}
		</div>`;
	}
}

const app = new App();
document.getElementById('root').appendChild(app.node);
