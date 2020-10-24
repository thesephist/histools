const {
	Component,
} = window.Torus;

class App extends Component {
	compose() {
		return jdom`<div class="app">
			<h2>Hi</h2>
		</div>`;
	}
}

const app = new App();
document.getElementById('root').appendChild(app.node);
