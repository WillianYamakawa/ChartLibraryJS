# ChartLibraryJS

Developed by Willian Yamakawa Souza

Dependency: JQuery

Usage Example:

```js
LineChart.load("chart1",
{
	title: "Titulo #1",
	labels: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio"],
	data:
	[
		{
			title: "Vendas mensais",
			color: '#1B93D8',
			strokeWidth: 2,
			hideCircle: true,
			values: [10, 220, 100, 50, 190]
		},
		{
			title: "Lucro mensal",
			color: '#ff93D8',
			strokeWidth: 3,
			values: [219, 60, 90, -80, 210]
		}
	]
});

BarChart.load("chart2",
{
        title: 'Um grafico',
        labels: ["Janeiro", "Fevereiro", "Março", "Abril", "Maio"],
        radius: 10,
        data: [
            {
                title: "Dataset 1",
                color: '#1B93D833',
                stroke: '#1B93ff',
                strokeWidth: 2,
                values: [10, 21, 45, 13, 41],
            },
            {
                title: "Dataset 2",
                color: '#ff93D833',
                stroke: '#ff93ff',
                strokeWidth: 2,
                values: [-10, 11, 72, 33, 41],
            },
            {
                title: "Dataset 3",
                color: '#1BffD833',
                stroke: '#1Bffff',
                strokeWidth: 2,
                values: [55, 45, -12, -13, -41],
            },
        ],
    });
```
![Captura de Tela (4)](https://user-images.githubusercontent.com/84150755/222928955-e7dc79f2-59fb-4201-9977-ae69af8bd302.png)
![Captura de Tela (5)](https://user-images.githubusercontent.com/84150755/222928956-ae9faddf-df86-4884-b58b-07b42abb3a43.png)

