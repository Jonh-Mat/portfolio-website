import GloCard from "../components/GloCard";
import TitleHeader from "../components/TitleHeader";
import { testimonials } from "../constants";

const TEstimonials = () => {
  return (
    <section id="testimonials" className="flex-center section-padding">
      <div className="w-full h-full md:px-10 px-5">
        <TitleHeader
          title="What people Say About Me?"
          sub="Client Feedback Highlights"
        />
        <div className="lg:columns-3 md:columns-2 columns-1 mt-16">
          {testimonials.map((testimonial) => (
            <GloCard card={testimonial}>
              <div>
                <div className="flex items-center gap-3">
                  <div>
                    <img src={testimonial.imgPath} alt={testimonials.name} />
                  </div>
                  <div>
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-white-50">{testimonial.mentions}</p>
                  </div>
                </div>
              </div>
            </GloCard>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TEstimonials;
