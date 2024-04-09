/**

Copyright 2023 Asaf Yurdakul and Mert Software & Electronic A.Ş, Bursa Turkiye.

Licensed under the GNU General Public License, Version 3.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	https://www.gnu.org/licenses/gpl-3.0.html

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

 **/

module.exports = function (RED) {
	"use strict";

	function oeecalculator(config) {
		RED.nodes.createNode(this, config);
		let node = this;

		let startDate = new Date();
		let startedItemcount = 0;
		let isStartedItemCount = false;

		let startedWasteItemcount = 0;
		let isStartedWasteItemCount = false;

		let totalWorkTime = 0;
		let totalStopTime = 0;

		node.on('input', function (msg) {
			// do nothing unless we have a payload
			if (!msg.hasOwnProperty("payload")) {
				return;
			}

			if (msg.payload.hasOwnProperty("interval")) {
				config.interval = msg.payload.interval;
			}

			if (msg.payload.hasOwnProperty("expecteditemcount")) {
				config.expecteditemcount = msg.payload.expecteditemcount;
			}


			if (msg.payload.hasOwnProperty("itemcount") && !isStartedItemCount) {
				startedItemcount = msg.payload.itemcount;
				isStartedItemCount = true;
			}

			if (msg.payload.hasOwnProperty("wasteitemcount") && !isStartedWasteItemCount) {
				startedWasteItemcount = msg.payload.wasteitemcount;
				isStartedWasteItemCount = true;
			}

			if (msg.payload.hasOwnProperty("workingTime")) {
				totalWorkTime = totalWorkTime + msg.payload.workingTime;
			}

			if (msg.payload.hasOwnProperty("stoppageTime")) {
				totalStopTime = totalStopTime + msg.payload.stoppageTime;
			}


			let current = new Date();
			let diffTime = Math.abs(current.getTime() - startDate);
			diffTime = diffTime / 1000.0;
			if (diffTime < config.interval) {
				this.status({ fill: "yellow", shape: "dot", text: diffTime.toString() });
			}
			else {

				let oee = {}
				if (msg.payload.hasOwnProperty("itemcount") && msg.payload.hasOwnProperty("wasteitemcount")) {
					oee.itemCount = msg.payload.itemcount - startedItemcount;
					oee.badItemCount = msg.payload.wasteitemcount - startedWasteItemcount;
					oee.workingTime = totalWorkTime ;
					oee.stoppageTime = totalStopTime;
				}

				let inputs = {
					"itemcount": msg.payload.itemcount,
					"wasteitemcount": msg.payload.wasteitemcount,
					"interval": msg.payload.interval,
					"expecteditemcount": msg.payload.expecteditemcount,
				}

				msg.payload = {}
				msg.payload.inputs = inputs;


				msg.payload.availability = (((oee.workingTime - oee.stoppageTime) / 1000) / config.interval).toFixed(2);
				msg.payload.performance = ((config.interval / config.expecteditemcount) * (oee.itemCount - oee.badItemCount) / ((oee.workingTime - oee.stoppageTime) / 1000)).toFixed(2);
				msg.payload.quality = ((oee.itemCount - oee.badItemCount) / oee.itemCount).toFixed(2);
				msg.payload.oee = (msg.payload.availability * msg.payload.performance * msg.payload.quality).toFixed(2);

				msg.payload.details = {
					itemCount : oee.itemCount,
					badItemCount : oee.badItemCount,
					goodItemCount: oee.itemCount - oee.badItemCount,
					totalWorkTime: oee.workingTime,
					totalStoppageTime: oee.stoppageTime,
					realWorkingTime: oee.workingTime - oee.stoppageTime
				};

				this.status({ fill: "green", shape: "dot", text: "calculated" });
				node.send(msg);

				startDate = new Date();
				totalWorkTime = 0;
				totalStopTime = 0;
				startedItemcount = 0;
				isStartedItemCount = false;
				startedWasteItemcount = 0;
				isStartedWasteItemCount = false;

				
			}

		});
	}
	RED.nodes.registerType("oee-calculator", oeecalculator);
}