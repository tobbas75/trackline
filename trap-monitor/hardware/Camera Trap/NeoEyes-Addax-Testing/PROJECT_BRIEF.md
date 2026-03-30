# NE301 + AddaxAI — On-Device Edge AI Camera Trap

> **Goal:** Run the AddaxAI/MegaDetector wildlife detection model directly on the
> NE301's STM32N6 Neural-ART NPU (0.6 TOPS) — no cloud, no backend.

**Status:** Pre-arrival setup
**Created:** 2026-03-29

---

## Table of Contents

1. [Understanding the AddaxAI Ecosystem](#1-understanding-the-addaxai-ecosystem)
2. [The On-Device Strategy](#2-the-on-device-strategy)
3. [Recommended Two-Stage On-Device Pipeline](#3-recommended-two-stage-on-device-pipeline)
4. [Getting the MegaDetector Weights](#4-getting-the-megadetector-weights)
5. [Full Export & Quantization Pipeline](#5-full-export--quantization-pipeline)
6. [NE301 Model JSON Configuration](#6-ne301-model-json-configuration)
7. [Build & Flash to NE301](#7-build--flash-to-ne301)
8. [Development Environment Setup](#8-development-environment-setup)
9. [Training Your Own Regional Wildlife Model](#9-training-your-own-regional-wildlife-model)
10. [Using AddaxAI / MegaDetector as Training Data Source](#10-using-addaxai--megadetector-as-training-data-source)
11. [SpeciesNet as an Alternative Model Base](#11-speciesnet-as-an-alternative-model-base)
12. [Complete Camera Trap Workflow on NE301](#12-complete-camera-trap-workflow-on-ne301)
13. [Model Size & Performance Estimates](#13-model-size--performance-estimates-for-ne301)
14. [NE301 Hardware Reference](#14-ne301-hardware-reference)
15. [Key Tools & Links](#15-key-tools--links)
16. [Test Plan](#16-test-plan)
17. [Open Questions & Risks](#17-open-questions--risks)
18. [Summary: Recommended Path to v1 Deployment](#18-summary-recommended-path-to-v1-deployment)

---

## 1. Understanding the AddaxAI Ecosystem

**AddaxAI** (by Addax Data Science, https://addaxdatascience.com/addaxai/) is an
open-source desktop application that pipelines two AI models:

| Component | What it does | Architecture | Format |
|-----------|-------------|-------------|--------|
| **MegaDetector v5** | Detects animals / humans / vehicles (bounding boxes only) | YOLOv5 (PyTorch) | `.pt` |
| **Species classifier** | Identifies animal to species level (runs on MD crops) | YOLOv5 / EfficientNet (PyTorch) | `.pt` |
| **SpeciesNet ensemble** | Google's combined detector+classifier (2000+ species) | YOLOv5 + EfficientNet V2 M | PyTorch |

> There is **no hosted API** — AddaxAI runs locally. The models are PyTorch `.pt` files
> downloadable from GitHub/Kaggle, which means they **can be exported to TFLite INT8**
> and run on the NE301.

### What AddaxAI custom models are (from Addax Data Science)

Addax Data Science builds **custom YOLOv5 models** trained on your regional species dataset.
These are the same format as MegaDetector and follow the same export path.

### The AWC 135 Model (Australia)

| Property | Value |
|----------|-------|
| Name | AWC 135 |
| Region | Australia (Victoria, 28 bioregions) |
| Species count | 135 Australian species |
| Accuracy | 95.2% (out-of-sample), 91% F1 across all 135, 95% F1 on top 108 |
| Training data | ~5 million images from Parks Victoria, 20+ organisations |
| Architecture | Fine-tuned SpeciesNet (Google) — EfficientNet backbone |
| Funding | Australian Government (Dept. of Climate Change, Energy, Environment and Water) |
| Licence | CC-BY-NC-SA (restricts commercial use — see risks section) |

---

## 2. The On-Device Strategy

The NE301's Neural-ART NPU supports **TFLite INT8** models via ST Edge AI (`stedgeai`).
The pipeline is:

```
MegaDetector / Custom YOLOv5 weights (.pt)
    |
    v  yolo export format=tflite imgsz=256 int8=True
TFLite FP32 / INT8
    |
    v  tflite_quant.py (CamThink quantization tool)
Quantized TFLite INT8 (.tflite)
    |
    v  make pkg-model (CamThink build system)
NE301 model package (.bin)
    |
    v  Flash via Web UI or make flash-model
Runs on Neural-ART NPU @ 0.6 TOPS
```

### Key constraint: model size vs. NPU memory

| Resource | Available on NE301 |
|----------|--------------------|
| PSRAM | 64 MB |
| HyperFlash | 128 MB |
| NPU SRAM (on-chip) | 4.2 MB |
| Model storage partition | Flash addr `0x70900000` |

MegaDetector v5 Nano (`yolov5n.pt`) quantized to INT8 at 256x256 input = **~2-4 MB** — fits.
MegaDetector v5 Small/Medium at full resolution will exceed NPU SRAM and require tiling.
**Recommended: start with YOLOv5n or YOLOv5s at 256x256 INT8.**

---

## 3. Recommended Two-Stage On-Device Pipeline

Since the NE301 has 0.6 TOPS and 64 MB PSRAM, the most practical design mirrors what
AddaxAI does on desktop — but both stages run locally on device:

```
Stage 1: Animal Detector (runs every PIR wake)
  -- MegaDetector-style YOLOv5n (3 classes: animal / human / vehicle)
  -- Input: 256x256 INT8 TFLite
  -- If confidence > threshold -> trigger Stage 2
  -- If no animal -> discard, go back to deep sleep

Stage 2: Species Classifier (only runs if Stage 1 fires)
  -- YOLOv5n classifier or EfficientNet V2 S (cropped to animal bbox)
  -- Input: 128x128 or 256x256 INT8 TFLite
  -- Output: species class + confidence
  -- Publish result via MQTT -> SD card
```

> This mirrors the AddaxAI pipeline exactly — detect first, classify crop second —
> but the NE301 firmware only supports **one active model at a time**.
> The workaround is to either: (a) combine both into a single YOLOv5 detection head
> that outputs species classes directly, or (b) use OTA to swap models between wake cycles.

**Simplest approach for v1:** Train a **single YOLOv5n detection model** that outputs
your target species as classes directly (not just "animal"), skipping Stage 2.

---

## 4. Getting the MegaDetector Weights

```bash
# Option A: via pip (SpeciesNet/MegaDetector)
pip install megadetector speciesnet

# Download MegaDetector v5 weights directly from Kaggle
# https://www.kaggle.com/models/google/speciesnet
# Direct MDv5 weights: https://github.com/agentmorris/MegaDetector
# (see "Downloading SpeciesNet model weights directly" section)

# Or clone the repo
git clone https://github.com/agentmorris/MegaDetector.git
cd MegaDetector
```

MegaDetector v5 comes in:
- `md_v5a.0.0.pt` — optimised for photos
- `md_v5b.0.0.pt` — optimised for video frames

For NE301 deployment, start with `md_v5a.0.0.pt` which is YOLOv5x6 architecture
(very large). You will need to either:
- Use the **nano variant** re-trained on the same dataset (community versions exist), or
- **Retrain YOLOv5n** using MegaDetector's LILA.science training data, or
- Use the **SpeciesNet-style EfficientNet S** as a classifier after a lightweight detector

---

## 5. Full Export & Quantization Pipeline

### 5.1 — Export MegaDetector / YOLOv5 to TFLite

```bash
# Clone YOLOv5 (required for export)
git clone https://github.com/ultralytics/yolov5.git
cd yolov5
pip install -r requirements.txt tensorflow

# Export your .pt model to TFLite INT8
# Use imgsz=256 for NE301 (balance of speed and accuracy)
python export.py \
  --weights /path/to/your_wildlife_model.pt \
  --include tflite \
  --imgsz 256 \
  --int8 \
  --data data/coco.yaml   # replace with your species data.yaml

# Output: your_wildlife_model_saved_model/your_wildlife_model_int8.tflite
```

> **For AddaxAI custom models:** Addax Data Science delivers models as `.pt` files.
> Request this from them explicitly. The same export command applies.

### 5.2 — Quantize with CamThink Tool (for Neural-ART NPU)

```yaml
# user_config_quant.yaml
model:
  name: wildlife_detector_256        # your model name
  uc: od_coco                        # use od_coco for detection, change if classifier
  model_path: ./your_wildlife_model_saved_model
  input_shape: [256, 256, 3]

quantization:
  fake: False
  quantization_type: per_channel
  quantization_input_type: uint8
  quantization_output_type: int8
  calib_dataset_path: ./calibration_images/   # use real camera trap images!
  export_path: ./quantized_models

pre_processing:
  rescaling: {scale: 255, offset: 0}
```

```bash
pip install hydra-core munch
python tflite_quant.py --config-name user_config_quant.yaml
# Output: ./quantized_models/wildlife_detector_256_quant_pc_ui_od_coco.tflite
```

> **Critical:** Use real camera trap images from your deployment area as calibration data —
> not COCO images. This dramatically improves INT8 quantization accuracy for wildlife models.

### 5.3 — Evaluate Quantized Model

```bash
# Validate the quantized model before deploying
yolo val \
  model=./quantized_models/wildlife_detector_256_quant_pc_ui_od_coco.tflite \
  data=your_species.yaml \
  imgsz=256 \
  int8

# Also use Netron to inspect output shape/quantization params (needed for JSON config)
# https://netron.app -- drag and drop your .tflite file
```

---

## 6. NE301 Model JSON Configuration

After quantization, create the companion `.json` file in `Model/weights/`.
The values for `scale` and `zero_point` must come from Netron or the quantization log.

```json
{
  "input_spec": {
    "width": 256,
    "height": 256,
    "data_type": "uint8",
    "normalization": {
      "mean": [0, 0, 0],
      "std": [255, 255, 255]
    }
  },
  "output_spec": {
    "height": 84,
    "width": 1344,
    "data_type": "int8",
    "scale": "<from_netron_output_tensor>",
    "zero_point": "<from_netron_output_tensor>"
  },
  "postprocess_type": "pp_od_yolo_v8_ui",
  "postprocess_params": {
    "num_classes": 3,
    "class_names": [
      "animal",
      "human",
      "vehicle"
    ],
    "confidence_threshold": 0.35,
    "iou_threshold": 0.45,
    "max_detections": 10,
    "total_boxes": 1344,
    "raw_output_scale": "<from_netron>",
    "raw_output_zero_point": "<from_netron>"
  }
}
```

> **Note on `postprocess_type`:** The CamThink firmware supports:
> - `pp_od_yolo_v8_ui` — uint8 input, int8 output (recommended)
> - `pp_od_yolo_v8_uf` — uint8 input, float32 output
>
> YOLOv5 and YOLOv8 share compatible output formats when exported to TFLite at the same
> image resolution. If output dims differ from 84x1344, check Netron and update
> `height`/`width`/`total_boxes` accordingly (e.g. YOLOv5n at 256x256 may be 85x1344).

### Class names for different model configurations

**MegaDetector-style (3 classes — animal/human/vehicle detector only):**
```json
"class_names": ["animal", "human", "vehicle"],
"num_classes": 3
```

**Species-level model (example — Australian wildlife):**
```json
"class_names": [
  "kangaroo", "wallaby", "wombat", "echidna", "possum",
  "quoll", "bilby", "bandicoot", "koala", "dingo",
  "feral_cat", "feral_pig", "fox", "rabbit", "human", "vehicle", "empty"
],
"num_classes": 17
```

**Recommended confidence thresholds for camera trap use:**

| Class type | Threshold | Reason |
|------------|-----------|--------|
| Animal detector (Stage 1) | 0.35 | Lower = fewer missed animals |
| Species classifier (Stage 2) | 0.55 | Higher = fewer misidentifications |
| Human/vehicle detection | 0.70 | High confidence only for privacy |

---

## 7. Build & Flash to NE301

```bash
# Clone the NE301 firmware repo
git clone https://github.com/camthink-ai/ne301.git
cd ne301

# Copy your quantized model and JSON config
cp /path/to/wildlife_detector_256_quant_pc_ui_od_coco.tflite Model/weights/
cp /path/to/wildlife_detector_256_quant_pc_ui_od_coco.json   Model/weights/

# Update Model/Makefile to point to your model
# MODEL_NAME = wildlife_detector_256_quant_pc_ui_od_coco
# MODEL_TFLITE = $(WEIGHTS_DIR)/$(MODEL_NAME).tflite
# MODEL_JSON   = $(WEIGHTS_DIR)/$(MODEL_NAME).json

# Build the model package
make pkg-model
# Output: build/ne301_Model_<version>_pkg.bin

# Flash options:
# Option A -- Direct flash via ST-Link (dev board required)
make flash-model

# Option B -- Web UI (recommended, no ST-Link needed)
# 1. Connect to NE301 Wi-Fi AP
# 2. Open http://192.168.10.10
# 3. Feature Debugging -> Upload -> drop ne301_Model_xxx_pkg.bin
# 4. Or: System Settings -> Firmware Upgrade -> upload model binary
```

---

## 8. Development Environment Setup

Full toolchain required to build and flash:

```bash
# Clone repo
git clone https://github.com/camthink-ai/ne301.git
cd ne301

# Option A: Docker (recommended)
docker pull camthink/ne301-dev:latest
docker run -it --rm --privileged \
  -v $(pwd):/workspace \
  -v /dev/bus/usb:/dev/bus/usb \
  camthink/ne301-dev:latest

# Option B: Manual install -- required tools:
# - ARM GCC 13.3+              (arm-none-eabi-gcc)
# - GNU Make 3.81+
# - Python 3.8+
# - Node.js 20+ and pnpm 9+
# - STM32CubeProgrammer v2.19.0
# - STM32_SigningTool_CLI v2.19.0
# - ST Edge AI Core v2.2 (stedgeai) <-- critical for NPU model validation

# Verify environment
./check_env.sh

# Build everything
make

# Build just the model package
make model
make pkg-model

# Flash all components
make flash

# Flash specific components
make flash-fsbl    # bootloader (rarely needed)
make flash-app     # main firmware
make flash-web     # web UI
make flash-model   # AI model <-- most common
make flash-wakecore  # STM32U0 power controller
```

### Flash addresses (for manual STM32CubeProgrammer use)

| Binary | MCU | Flash Address |
|--------|-----|--------------|
| `ne301_FSBL_signed.bin` | STM32N6 | `0x70000000` |
| `ne301_App_signed_pkg.bin` | STM32N6 | `0x70100000` |
| `ne301_Web_pkg.bin` | STM32N6 | `0x70400000` |
| `ne301_Model_pkg.bin` | STM32N6 | `0x70900000` |
| `ne301_WakeCore.bin` | STM32U0 | `0x08000000` |

---

## 9. Training Your Own Regional Wildlife Model

If you want a species-level model (not just animal/human/vehicle), the path is:

### 9.1 — Collect & label camera trap images

- Minimum: ~10,000 images per class
- Use varied locations, lighting, backgrounds
- Label with: species name + location ID (camera site)
- Tool: [ZIP-classifier](https://github.com/PetervanLunteren/ZIP-classifier) or CVAT

### 9.2 — Prepare data.yaml for YOLOv5/v8

```yaml
# wildlife_species.yaml
path: /path/to/dataset
train: images/train
val: images/val

nc: 5   # number of classes
names:
  0: kangaroo
  1: wallaby
  2: wombat
  3: feral_cat
  4: empty
```

### 9.3 — Train YOLOv5n (optimised for NE301 size constraints)

```bash
git clone https://github.com/ultralytics/yolov5
cd yolov5
pip install -r requirements.txt

# Train from COCO pre-trained weights (transfer learning)
python train.py \
  --img 256 \
  --batch 64 \
  --epochs 100 \
  --data wildlife_species.yaml \
  --weights yolov5n.pt \
  --project wildlife_ne301 \
  --name v1

# Or train from scratch
python train.py \
  --img 256 \
  --batch 64 \
  --epochs 200 \
  --data wildlife_species.yaml \
  --weights '' \
  --cfg models/yolov5n.yaml \
  --project wildlife_ne301 \
  --name v1_scratch
```

### 9.4 — Export to TFLite INT8

```bash
python export.py \
  --weights wildlife_ne301/v1/weights/best.pt \
  --include tflite \
  --imgsz 256 \
  --int8 \
  --data wildlife_species.yaml

# Output: wildlife_ne301/v1/weights/best_saved_model/best_int8.tflite
```

### 9.5 — Quantize with CamThink tool -> package -> flash

(Follow steps in Section 5.2 -> 7 above)

---

## 10. Using AddaxAI / MegaDetector as Training Data Source

The MegaDetector ecosystem gives you access to massive labelled datasets via LILA.science:

```python
# Install MegaDetector tools
pip install megadetector

# Run MegaDetector on your unlabelled camera trap images
# to auto-generate animal bounding boxes for training data
python -m megadetector.detection.run_detector_batch \
  md_v5a.0.0.pt \
  /path/to/your/images \
  /path/to/output_detections.json \
  --output_relative_filenames

# Convert MegaDetector output to YOLO format for training
# (use megadetector data_management tools)
```

This lets you bootstrap a training dataset: MegaDetector finds the animals,
you provide species labels, then train a combined species-aware model.

---

## 11. SpeciesNet as an Alternative Model Base

Google's SpeciesNet (https://github.com/google/cameratrapai) uses:
- **Detector:** MegaDetector (YOLOv5, finds animal bounding boxes)
- **Classifier:** EfficientNet V2 M (classifies crops to 2000+ species)

The EfficientNet V2 **Small** variant can potentially be exported to TFLite:

```bash
pip install speciesnet

# Download model weights from Kaggle
# https://www.kaggle.com/models/google/speciesnet/pyTorch/v4.0.2a/1

# Export EfficientNet V2 S to TFLite (requires torch + tf)
python -c "
import torch
import tensorflow as tf

# Load PyTorch model
model = torch.load('speciesnet_v4.0.2a.pt', map_location='cpu')
model.eval()

# Trace to TorchScript
dummy_input = torch.randn(1, 3, 256, 256)
traced = torch.jit.trace(model, dummy_input)
traced.save('speciesnet_traced.pt')

# Convert via ONNX -> TFLite
import onnx
torch.onnx.export(
    model, dummy_input, 'speciesnet.onnx',
    opset_version=12,
    input_names=['input'],
    output_names=['output']
)
# Then use onnx-tf to convert to TFLite
"

# pip install onnx onnx-tf
# python -m onnx_tf.backend.prepare speciesnet.onnx -o speciesnet_tf
# tflite_convert --saved_model_dir=speciesnet_tf --output_file=speciesnet.tflite
```

> **Important caveat:** EfficientNet V2 M (full SpeciesNet) is likely too large for the
> NE301 NPU at full resolution. Use EfficientNet V2 **S** at 256x256 or MobileNetV3 as
> the classifier backbone, or reduce to your target species set (10-50 classes vs 2000+).

---

## 12. Complete Camera Trap Workflow on NE301

```
HARDWARE SETUP
--------------
NE301 (LTE Cat.1 variant recommended for remote deployment)
  + OS04C10-88-3M camera module (88 deg FOV, 3m focus)
  + PIR sensor on GPIO header
  + 4x AA lithium batteries (not alkaline -- better cold performance)
  + Pole bracket or tree mount

POWER MODE CONFIG (Web UI)
--------------------------
Deep sleep between triggers: 6.1 uA
Wake source: GPIO -> PIR sensor
PIR sensitivity: 30-40 (outdoor, reduce false positives)
PIR pulse count: 2 (require 2 pulses before capture)
PIR blind time: 5-10 s (prevent repeat triggers)

CAPTURE CONFIG
--------------
Trigger: IO trigger (PIR)
Image size: 1280x720
AI: enabled (your wildlife model)
Store to SD: true (local backup)
MQTT: enabled (upload when Cat.1/Wi-Fi available)

INFERENCE FLOW (on-device)
--------------------------
1. PIR fires -> STM32U0 wakes STM32N6 (milliseconds)
2. Camera captures 1280x720 JPEG
3. Image downscaled to 256x256 internally
4. YOLOv5n wildlife model runs on Neural-ART NPU (2-3 s)
5. Output: class_name + confidence + bounding box (normalised)
6. If confidence > 0.35 AND class != "empty":
   -> Publish MQTT payload (device_info + ai_result + base64 image)
   -> Save to SD card
   else:
   -> Discard, return to deep sleep
7. STM32N6 sleeps, STM32U0 resumes 6.1 uA standby

MQTT PAYLOAD (published to ne301/{device_id}/upload/report)
-----------------------------------------------------------
{
  "metadata": { "timestamp": 1766132582, "width": 1280, "height": 720 },
  "device_info": { "battery_percent": 74, "communication_type": "cat1" },
  "ai_result": {
    "model_name": "Wildlife_NE301_YOLOv5n_256_INT8",
    "inference_time_ms": 2400,
    "ai_result": {
      "type_name": "object_detection",
      "detection_count": 1,
      "detections": [{
        "class_name": "kangaroo",
        "confidence": 0.82,
        "x": 0.42, "y": 0.31,
        "width": 0.18, "height": 0.44
      }]
    }
  },
  "image_data": "data:image/jpeg;base64,..."
}
```

---

## 13. Model Size & Performance Estimates for NE301

| Model | Classes | Input | INT8 Size | Inference (est.) | Fits NE301? |
|-------|---------|-------|-----------|-----------------|-------------|
| YOLOv5n | 3 (MD-style) | 256x256 | ~2 MB | ~1-2 s | Yes |
| YOLOv5n | 20 species | 256x256 | ~2.5 MB | ~1-2 s | Yes |
| YOLOv5s | 20 species | 256x256 | ~7 MB | ~2-4 s | Yes |
| YOLOv8n | 20 species | 256x256 | ~3 MB | ~2-3 s | Yes |
| YOLOv5m | 20 species | 256x256 | ~21 MB | ~5-8 s | Marginal |
| EfficientNet V2 S | 2000 species | 256x256 | ~20 MB | ~4-7 s | Marginal |
| MegaDetector v5a (full) | 3 | 1280x1280 | ~170 MB | N/A | Too large |

**Recommendation for v1:** YOLOv5n or YOLOv8n at 256x256, limited to your 10-30 target
species + "empty" + "human" + "vehicle". This gives fast inference (< 3 s), small model
footprint, and fits comfortably within the Neural-ART NPU memory.

---

## 14. NE301 Hardware Reference

### 14.1 Variants & Pricing

| Model | Price | Connectivity | Power | Best For |
|-------|-------|-------------|-------|----------|
| **NE301 Wi-Fi** | $199.90 | Wi-Fi | USB-C or battery | Labs, offices, indoor pilots |
| **NE301 LTE Cat.1** | $251.00 | Wi-Fi or LTE Cat.1 | USB-C or battery | Agriculture, remote, distributed |
| **NE301 PoE** | $258.00 | Wi-Fi or Ethernet (PoE) | PoE | Factories, smart city, continuous |

> **Note:** Pricing from manufacturer listing. Currency not confirmed as AUD -- likely USD. Verify before budgeting.

### 14.2 MCU & AI Specifications

| Item | Specification |
|------|--------------|
| MCU Core | Cortex-M55 @ 800 MHz with Arm Helium vector extensions |
| NPU | Neural-ART accelerator, 1 GHz, 600 GOPS (0.6 TOPS) |
| Efficiency | 3 TOPS/W without active cooling |
| On-chip SRAM | 4.2 MB |
| HyperFlash | 128 MB |
| PSRAM | 64 MB |
| ISP | Dedicated (demosaic, auto white balance, preprocessing) |
| Video Codec | Hardware H.264 and JPEG, 1080p@30 FPS |
| Boot/Wake | Microsecond boot, millisecond wake-up |

### 14.3 Main Board I/O

| Item | Specification |
|------|--------------|
| Camera Interfaces | USB 4-pin x1, MIPI CSI-2 x1 |
| 16-pin IO | UART x1, RS485 x1, I2C x1, SPI x1, GPIO x2, 3.3V x1, 5V x1, GND x2 |
| Debug & Power | USB Type-C x1, 4-pin UART Wafer x1 |
| Audio | Input x1 (Wafer), Output x1 (Wafer) |
| Expansion | 12-pin + 16-pin connectors for comms/sensor modules |
| Storage | TF card (Micro SD) |
| Connectivity | Wi-Fi 6 / BLE (built-in) |
| Buttons | Reset, Boot, Capture/Record |
| LEDs | Power, System |
| Dimensions | 77 x 77 x 48 mm (enclosure) |
| IP Rating | IP67 |
| Operating Temp | -20C to +50C |
| Certifications | CE / FCC / RoHS / SRRC |

### 14.4 Camera Modules

| Type | Model | FOV | Focus Distance | Use Case |
|------|-------|-----|----------------|----------|
| CPI | OS04C10-51-4M | 51 deg | 4 m | Standard |
| CPI | OS04C10-88-3M | 88 deg | 3 m | Wide angle |
| CPI | OS04C10-137-4M | 137 deg | 2 m | Ultra-wide |
| USB | SC200AI-51-4M | 51 deg | 4 m | Standard |
| USB | SC200AI-88-3M | 88 deg | 3 m | Wide angle |
| USB | SC200AI-137-4M | 137 deg | 2 m | Ultra-wide |

Standard kit ships with the CPI OS04C10 module.

### 14.5 Cat-1 LTE Modules

| Module | Coverage | Standard |
|--------|----------|----------|
| Quectel EG912U-GL | Asia / Europe / Oceania (excl. N. America) | LTE FDD/TDD + GSM |
| Quectel EG915Q-NA | North America | LTE FDD/TDD + GSM |

> For Australian deployment: use **EG912U-GL**.

### 14.6 Power States

| Mode | Current Draw | Description |
|------|-------------|-------------|
| Deep Sleep | 6.1 uA | Minimum; wakes via RTC, GPIO, BLE, MQTT |
| Standby | ~7-8 uA | U0 managed |
| Active (Wi-Fi) | 70 mA | Capture + inference + upload |
| Active (Cat-1) | 110-119 mA | Same over cellular |

Power managed by independent **STM32U0** power hub.

### 14.7 Battery Life — Wi-Fi (4x AA, 1750 mAh effective)

| Captures/Day | Daily Power (mAh) | Battery Life |
|--------------|-------------------|-------------|
| 1 | 0.36 | 13.3 years |
| 3 | 0.79 | 6.07 years |
| 5 | 1.22 | 3.93 years |
| 10 | 2.29 | 2.09 years |

### 14.8 Battery Life — Cat-1 LTE (4x AA)

| Captures/Day | Daily Power (mAh) | Battery Life |
|--------------|-------------------|-------------|
| 1 | 0.57 | 8.41 years |
| 3 | 1.43 | 3.35 years |
| 5 | 2.29 | 2.09 years |
| 10 | 4.42 | 1.08 years |

### 14.9 Temperature Impact on Battery

| Temperature | Performance | Reduction |
|-------------|------------|-----------|
| 20-25C (room) | 100% baseline | -- |
| 0-10C (cold) | 70-80% | 20-30% |
| -10 to 0C (severe) | 40-60% | 40-60% |
| 30-40C (hot) | 90-95% | 5-10% |
| >50C (extreme) | 70-80% | 20-30% |

### 14.10 Wake Triggers

| Trigger | Description |
|---------|-------------|
| RTC | Scheduled time-based wake (dawn/dusk sampling) |
| GPIO | PIR sensor, radar, external IO |
| UART / RS485 | Serial sensor signals |
| BLE | Bluetooth LE trigger |
| MQTT | Remote command over network |

### 14.11 PIR Configuration

Web UI path: `Feature Debugging -> Wake-up Source -> IO Trigger - PIR`

| Parameter | Description | Recommended |
|-----------|-------------|-------------|
| Sensitivity | Range 0-255 | 30-50 for outdoor wildlife |
| Blind Time | Non-responsive window after trigger | Tune per site |
| Window Time | Time window for valid trigger | Tune per site |
| Pulse Count | Pulses required for valid trigger | 2-3 (filters noise) |

### 14.12 MQTT Configuration

| Parameter | Value |
|-----------|-------|
| Broker | Your MQTT server IP/hostname |
| Port | 1883 (MQTT) / 8883 (MQTTS) |
| Client ID | Device serial number (default) |
| QoS | 0, 1, or 2 |
| Upload topic | `ne301/{device_id}/upload/report` |
| Control topic | `ne301/{device_id}/down/control` |
| Security | TLS with CA, client cert, client key support |

### 14.13 Remote Commands (Backend -> Device)

**Capture:**
```json
{
  "cmd": "capture",
  "request_id": "req-001",
  "params": {
    "enable_ai": true,
    "chunk_size": 0,
    "store_to_sd": false
  }
}
```

**Sleep:**
```json
{
  "cmd": "sleep",
  "request_id": "req-002",
  "params": {
    "duration_sec": 60
  }
}
```

### 14.14 Capture Button

| Action | Result |
|--------|--------|
| Short press | Trigger image capture + upload via MQTT |
| Hold 2 seconds | Wake Wi-Fi AP (blue LED lights) |
| Double-press + hold ~10 sec | Factory reset (erases all config) |

### 14.15 First-Time Setup Checklist

1. Remove rear cover (Phillips screwdriver)
2. Install 4x AA batteries
3. Wait for blue LED
4. Connect to Wi-Fi AP: `NE301{last 6 MAC digits}` (no password)
5. Browse to `http://192.168.10.10`
6. Login: default password = `hicamthink`
7. **Change password immediately** (`Home -> System Settings -> Device Password`)
8. Export config backup
9. Configure MQTT broker settings
10. Test capture + MQTT publish
11. Deploy model if ready

> AP auto-sleeps after 10 minutes. Short-press capture button to wake.

### 14.16 Firmware Update

| File Type | Example |
|-----------|---------|
| APP | `ne301_App_signed_v2.0.1.30_pkg.bin` |
| Web | `ne301_Web_v1.3.4.4_pkg.bin` |
| FSBL | `ne301_FSBL_signed_v1.0.0.2_pkg.bin` |

- APP and Web: update via Web UI (`System Settings -> Firmware Upgrade`)
- FSBL: requires serial console access
- **Always export config before upgrading**
- Enable "Keep current configuration" to preserve settings

---

## 15. Key Tools & Links

### NeoEyes NE301

| Resource | Link |
|----------|------|
| Product Page | https://www.camthink.ai/product/neoeyes-301/ |
| Wiki/Docs | https://wiki.camthink.ai/docs/neoeyes-ne301-series/ |
| Quick Start | https://wiki.camthink.ai/docs/neoeyes-ne301-series/quick-start/ |
| Model Training | https://wiki.camthink.ai/docs/neoeyes-ne301-series/application-guide/model-training-and-deployment/ |
| MQTT Protocol | https://wiki.camthink.ai/docs/neoeyes-ne301-series/application-guide/mqtt-data-interaction/ |
| Battery Life | https://wiki.camthink.ai/docs/neoeyes-ne301-series/ne301-battery-life/ |
| Dev Kit Guide | https://wiki.camthink.ai/docs/neoeyes-ne301-series/dev-kit-installation-guide/ |
| CamThink Discord | Via camthink.ai |

### AddaxAI / MegaDetector / SpeciesNet

| Resource | Link |
|----------|------|
| AddaxAI Website | https://addaxdatascience.com/addaxai/ |
| AddaxAI GitHub | https://github.com/PetervanLunteren/AddaxAI |
| AddaxAI Species Models | https://addaxdatascience.com/species-recognition-models/ |
| AddaxAI Forum | https://forum.addaxai.com/ |
| AddaxAI Paper (JOSS 2023) | DOI: 10.21105/joss.05581 |
| Addax Contact | peter@addaxdatascience.com |
| MegaDetector | https://github.com/agentmorris/MegaDetector |
| SpeciesNet (Google) | https://github.com/google/cameratrapai |
| SpeciesNet on Kaggle | https://www.kaggle.com/models/google/speciesnet |
| LILA.science (training data) | https://lila.science |

### Development Tools

| Tool | Purpose |
|------|---------|
| [Netron](https://netron.app) | Inspect model architecture, dimensions, quant params |
| [Ultralytics YOLOv5](https://github.com/ultralytics/yolov5) | Training and export |
| [Ultralytics YOLOv8](https://docs.ultralytics.com/) | `pip install ultralytics` |
| ST Edge AI Core | `pip install stedgeai` — NPU model validation |
| [Mosquitto](https://mosquitto.org/) | Local MQTT broker for testing |
| [CVAT](https://cvat.ai/) | Image labelling |
| [ZIP-classifier](https://github.com/PetervanLunteren/ZIP-classifier) | Addax labelling tool |

---

## 16. Test Plan

### Phase 1 — Unboxing & Bench Setup

- [ ] Power on with 4x AA batteries, confirm blue LED
- [ ] Connect to Wi-Fi AP (`NE301{last 6 MAC}`)
- [ ] Access Web UI at `http://192.168.10.10`
- [ ] Change default password from `hicamthink`
- [ ] Export default config as backup JSON
- [ ] Note firmware version, hardware version
- [ ] Test capture button (short press) — confirm image capture
- [ ] Review default AI model (likely COCO 80-class)
- [ ] Test JPEG quality and resolution settings

### Phase 2 — MQTT Integration

- [ ] Set up local MQTT broker (Mosquitto)
- [ ] Configure NE301 MQTT settings via Web UI
- [ ] Subscribe to `ne301/{device_id}/upload/report`
- [ ] Trigger capture, verify JSON payload received
- [ ] Validate payload structure matches documented schema
- [ ] Test remote capture command via control topic
- [ ] Test sleep command
- [ ] Measure end-to-end latency: trigger -> MQTT publish

### Phase 3 — Model Deployment

- [ ] Decide model strategy: single-stage species detector (recommended v1)
- [ ] Source or train YOLOv5n with target species
- [ ] Export to TFLite INT8 at 256x256
- [ ] Quantise with CamThink tool using field calibration images
- [ ] Inspect output with Netron, extract scale/zero_point
- [ ] Create model JSON config
- [ ] Build .bin package (`make pkg-model`)
- [ ] Flash to NE301 via Web UI
- [ ] Validate inference on test images (known species)

### Phase 4 — PIR & Trigger Testing

- [ ] Configure PIR via Web UI
- [ ] Test sensitivity settings (30, 40, 50) with human/animal movement
- [ ] Measure false positive rate over 24 h indoor test
- [ ] Test blind time settings to prevent repeat triggers
- [ ] Test RTC scheduled capture (dawn/dusk simulation)
- [ ] Verify wake-to-capture-to-sleep cycle timing

### Phase 5 — Field Trial

- [ ] Deploy at known wildlife site
- [ ] Run for 7+ days
- [ ] Collect MQTT data, compare species IDs to manual review
- [ ] Measure actual battery consumption
- [ ] Assess PIR false positive/negative rate in field
- [ ] Document weather conditions, mounting position, results

### Phase 6 — Evaluation & Decision

- [ ] Compare NE301 to custom B23 Camera Trap PCB design
- [ ] Assess model accuracy on Australian species in real conditions
- [ ] Determine if Cat-1 connectivity is sufficient for target areas
- [ ] Decision: adopt NE301, adapt design learnings to custom board, or hybrid approach

---

## 17. Open Questions & Risks

### Single Model Slot (HIGH — Critical Blocker)

The NE301 firmware runs **one `.tflite` model at a time**. The AddaxAI two-stage pipeline
(MegaDetector detect -> species classify) cannot run natively.

**Decision for v1:** Use a **single-stage species detector** — one YOLOv5n that outputs
species labels directly, skipping the two-stage approach. This is simpler, faster, and
works within the firmware's single-model constraint.

**Future:** Investigate firmware model-swap capability or request two-model support from CamThink.

### Model Source (HIGH)

AddaxAI doesn't have an exportable hosted model you can just download. Options:
1. Train your own YOLOv5n on regional species data (best for v1)
2. Use MegaDetector v5 (huge — needs retraining at nano scale)
3. Commission Addax Data Science to train a custom model — ask for `.pt` delivery
4. Use LILA.science datasets + MegaDetector auto-labelling to bootstrap training data

### AWC 135 Architecture Mismatch (MEDIUM-HIGH)

AWC 135 is an EfficientNet **classifier**, not a YOLOv5 **detector**. It cannot be
directly deployed on NE301 as the firmware expects YOLOv5/v8 detection output format.
The AWC 135 training data is the valuable asset — the model architecture needs to change.

### Licensing (MEDIUM)

AWC 135 is **CC-BY-NC-SA** (non-commercial). If Trap Monitor is a commercial product:
- Testing and evaluation: likely fine
- Commercial deployment: requires separate licensing from Addax Data Science
- Contact Peter van Lunteren early

### INT8 Quantisation Accuracy (MEDIUM)

Quantising float32 to INT8 typically reduces accuracy by 1-5%. Use real field images
as calibration data (not COCO) to minimise degradation. Validate with `yolo val` before
deploying.

### Cat-1 LTE Band Support (LOW)

EG912U-GL covers Oceania. Verify specific band support for Telstra/Optus in remote
deployment areas. SD card backup mitigates connectivity gaps.

---

## 18. Summary: Recommended Path to v1 Deployment

1. **Get your species list** — what animals are in your deployment area?
2. **Source training images** — LILA.science datasets, your own trap images, or
   contact Addax Data Science for a custom model (they deliver `.pt` files)
3. **Train YOLOv5n** at 256x256 with your species labels using YOLOv5 repo
4. **Export -> TFLite INT8** using `export.py --include tflite --int8`
5. **Quantize** with CamThink `tflite_quant.py` using real field images as calibration
6. **Write JSON config** (inspect output dims with Netron)
7. **Package & flash** via `make pkg-model` then Web UI upload
8. **Configure PIR** in Web UI (sensitivity 30-40, pulse count 2)
9. **Set MQTT** to publish detections to your backend / SD card
10. **Deploy**, monitor battery via `battery_percent` field in MQTT payload
